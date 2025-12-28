package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image/jpeg"
	"log"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
	"github.com/gorilla/websocket"
)

type Client struct {
	serverURL string
	conn      *websocket.Conn
}

func NewClient(serverURL string) *Client {
	return &Client{serverURL: serverURL}
}

func (c *Client) Connect() error {
	conn, _, err := websocket.DefaultDialer.Dial(c.serverURL, nil)
	if err != nil {
		return err
	}
	c.conn = conn
	return nil
}

func (c *Client) Close() {
	if c.conn != nil {
		c.conn.Close()
	}
}

func (c *Client) SendMessage(msgType string, data interface{}) error {
	msg := map[string]interface{}{
		"type": msgType,
		"data": data,
	}
	return c.conn.WriteJSON(msg)
}

func (c *Client) ReadMessage() (map[string]interface{}, error) {
	var response map[string]interface{}
	err := c.conn.ReadJSON(&response)
	return response, err
}

func main() {
	myApp := app.New()
	myWindow := myApp.NewWindow("Remote Admin Tool")
	myWindow.Resize(fyne.NewSize(1200, 800))

	serverURL := "localhost:8080"
	serverEntry := widget.NewEntry()
	serverEntry.SetText(serverURL)
	serverEntry.SetPlaceHolder("Server address (e.g., localhost:8080)")

	statusLabel := widget.NewLabel("Not connected")
	var client *Client

	// System Info Tab
	sysInfoText := widget.NewMultiLineEntry()
	sysInfoText.Disable()
	refreshSysBtn := widget.NewButton("Refresh System Info", func() {
		if client == nil || client.conn == nil {
			statusLabel.SetText("Not connected to server")
			return
		}

		if err := client.SendMessage("system_info", nil); err != nil {
			statusLabel.SetText("Error: " + err.Error())
			return
		}

		response, err := client.ReadMessage()
		if err != nil {
			statusLabel.SetText("Error reading response: " + err.Error())
			return
		}

		if data, ok := response["data"].(map[string]interface{}); ok {
			jsonData, _ := json.MarshalIndent(data, "", "  ")
			sysInfoText.SetText(string(jsonData))
		}
	})

	sysInfoTab := container.NewBorder(
		refreshSysBtn,
		nil, nil, nil,
		container.NewScroll(sysInfoText),
	)

	// File Manager Tab
	pathEntry := widget.NewEntry()
	pathEntry.SetText("C:\\")
	fileList := widget.NewList(
		func() int { return 0 },
		func() fyne.CanvasObject {
			return widget.NewLabel("Template")
		},
		func(i widget.ListItemID, o fyne.CanvasObject) {},
	)

	var currentFiles []map[string]interface{}

	listFilesBtn := widget.NewButton("List Files", func() {
		if client == nil || client.conn == nil {
			statusLabel.SetText("Not connected to server")
			return
		}

		fileOp := map[string]interface{}{
			"action": "list",
			"path":   pathEntry.Text,
		}

		if err := client.SendMessage("file_operation", fileOp); err != nil {
			statusLabel.SetText("Error: " + err.Error())
			return
		}

		response, err := client.ReadMessage()
		if err != nil {
			statusLabel.SetText("Error reading response: " + err.Error())
			return
		}

		if fileResp, ok := response["data"].(map[string]interface{}); ok {
			if filesData, ok := fileResp["data"].([]interface{}); ok {
				currentFiles = make([]map[string]interface{}, 0)
				for _, f := range filesData {
					if fileMap, ok := f.(map[string]interface{}); ok {
						currentFiles = append(currentFiles, fileMap)
					}
				}

				fileList.Length = func() int { return len(currentFiles) }
				fileList.UpdateItem = func(i widget.ListItemID, o fyne.CanvasObject) {
					label := o.(*widget.Label)
					if i < len(currentFiles) {
						name := currentFiles[i]["name"].(string)
						isDir := currentFiles[i]["is_dir"].(bool)
						if isDir {
							label.SetText("📁 " + name)
						} else {
							label.SetText("📄 " + name)
						}
					}
				}
				fileList.Refresh()
				statusLabel.SetText(fmt.Sprintf("Listed %d items", len(currentFiles)))
			}
		}
	})

	fileManagerTab := container.NewBorder(
		container.NewVBox(pathEntry, listFilesBtn),
		nil, nil, nil,
		fileList,
	)

	// Services Tab
	serviceList := widget.NewList(
		func() int { return 0 },
		func() fyne.CanvasObject {
			return widget.NewLabel("Template")
		},
		func(i widget.ListItemID, o fyne.CanvasObject) {},
	)

	var currentServices []map[string]interface{}

	listServicesBtn := widget.NewButton("List Services", func() {
		if client == nil || client.conn == nil {
			statusLabel.SetText("Not connected to server")
			return
		}

		serviceOp := map[string]interface{}{
			"action": "list",
		}

		if err := client.SendMessage("service_operation", serviceOp); err != nil {
			statusLabel.SetText("Error: " + err.Error())
			return
		}

		response, err := client.ReadMessage()
		if err != nil {
			statusLabel.SetText("Error reading response: " + err.Error())
			return
		}

		if serviceResp, ok := response["data"].(map[string]interface{}); ok {
			if servicesData, ok := serviceResp["data"].([]interface{}); ok {
				currentServices = make([]map[string]interface{}, 0)
				for _, s := range servicesData {
					if svcMap, ok := s.(map[string]interface{}); ok {
						currentServices = append(currentServices, svcMap)
					}
				}

				serviceList.Length = func() int { return len(currentServices) }
				serviceList.UpdateItem = func(i widget.ListItemID, o fyne.CanvasObject) {
					label := o.(*widget.Label)
					if i < len(currentServices) {
						name := currentServices[i]["display_name"].(string)
						status := currentServices[i]["status"].(string)
						label.SetText(fmt.Sprintf("%s - [%s]", name, status))
					}
				}
				serviceList.Refresh()
				statusLabel.SetText(fmt.Sprintf("Listed %d services", len(currentServices)))
			}
		}
	})

	servicesTab := container.NewBorder(
		listServicesBtn,
		nil, nil, nil,
		serviceList,
	)

	// Screen Viewer Tab
	screenImage := canvas.NewImageFromImage(nil)
	screenImage.FillMode = canvas.ImageFillContain

	captureBtn := widget.NewButton("Capture Screen", func() {
		if client == nil || client.conn == nil {
			statusLabel.SetText("Not connected to server")
			return
		}

		if err := client.SendMessage("screen_capture", nil); err != nil {
			statusLabel.SetText("Error: " + err.Error())
			return
		}

		response, err := client.ReadMessage()
		if err != nil {
			statusLabel.SetText("Error reading response: " + err.Error())
			return
		}

		if data, ok := response["data"].(map[string]interface{}); ok {
			if imgStr, ok := data["image"].(string); ok {
				imgData, err := base64.StdEncoding.DecodeString(imgStr)
				if err != nil {
					statusLabel.SetText("Error decoding image: " + err.Error())
					return
				}

				img, err := jpeg.Decode(bytes.NewReader(imgData))
				if err != nil {
					statusLabel.SetText("Error parsing image: " + err.Error())
					return
				}

				screenImage.Image = img
				screenImage.Refresh()
				statusLabel.SetText("Screen captured successfully")
			}
		}
	})

	screenTab := container.NewBorder(
		captureBtn,
		nil, nil, nil,
		container.NewScroll(screenImage),
	)

	// Connection controls
	connectBtn := widget.NewButton("Connect", func() {
		client = NewClient("ws://" + serverEntry.Text + "/ws")
		if err := client.Connect(); err != nil {
			statusLabel.SetText("Connection failed: " + err.Error())
			log.Println("Connection error:", err)
			return
		}
		statusLabel.SetText("Connected to " + serverEntry.Text)
	})

	disconnectBtn := widget.NewButton("Disconnect", func() {
		if client != nil {
			client.Close()
			client = nil
			statusLabel.SetText("Disconnected")
		}
	})

	connectionBox := container.NewVBox(
		widget.NewLabel("Server Address:"),
		serverEntry,
		container.NewHBox(connectBtn, disconnectBtn),
		statusLabel,
	)

	// Main tabs
	tabs := container.NewAppTabs(
		container.NewTabItem("Connection", connectionBox),
		container.NewTabItem("System Info", sysInfoTab),
		container.NewTabItem("File Manager", fileManagerTab),
		container.NewTabItem("Services", servicesTab),
		container.NewTabItem("Screen Viewer", screenTab),
	)

	myWindow.SetContent(tabs)
	myWindow.ShowAndRun()

	// Cleanup
	if client != nil {
		client.Close()
	}
}
