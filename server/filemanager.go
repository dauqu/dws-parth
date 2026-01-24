package main

import (
	"encoding/json"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"
)

type FileInfo struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"`
	Size    int64     `json:"size"`
	IsDir   bool      `json:"is_dir"`
	ModTime time.Time `json:"mod_time"`
}

type FileOperation struct {
	Action  string `json:"action"` // list, read, create, delete, write
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
	NewPath string `json:"new_path,omitempty"`
}

type FileResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func ListFiles(dirPath string) ([]FileInfo, error) {
	files, err := ioutil.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var fileList []FileInfo
	for _, f := range files {
		fullPath := filepath.Join(dirPath, f.Name())
		fileList = append(fileList, FileInfo{
			Name:    f.Name(),
			Path:    fullPath,
			Size:    f.Size(),
			IsDir:   f.IsDir(),
			ModTime: f.ModTime(),
		})
	}

	return fileList, nil
}

func ReadFile(path string) (string, error) {
	content, err := ioutil.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func CreateFile(path string, content string) error {
	return ioutil.WriteFile(path, []byte(content), 0644)
}

func DeleteFile(path string) error {
	return os.RemoveAll(path)
}

func CreateDirectory(path string) error {
	return os.MkdirAll(path, 0755)
}

func MoveFile(oldPath, newPath string) error {
	return os.Rename(oldPath, newPath)
}

func CopyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

func HandleFileOperation(op FileOperation) FileResponse {
	switch op.Action {
	case "list":
		files, err := ListFiles(op.Path)
		if err != nil {
			return FileResponse{Success: false, Message: err.Error()}
		}
		return FileResponse{Success: true, Message: "Files listed successfully", Data: files}

	case "read":
		content, err := ReadFile(op.Path)
		if err != nil {
			return FileResponse{Success: false, Message: err.Error()}
		}
		return FileResponse{Success: true, Message: "File read successfully", Data: content}

	case "create":
		err := CreateFile(op.Path, op.Content)
		if err != nil {
			return FileResponse{Success: false, Message: err.Error()}
		}
		return FileResponse{Success: true, Message: "File created successfully"}

	case "delete":
		err := DeleteFile(op.Path)
		if err != nil {
			return FileResponse{Success: false, Message: err.Error()}
		}
		return FileResponse{Success: true, Message: "File deleted successfully"}

	case "mkdir":
		err := CreateDirectory(op.Path)
		if err != nil {
			return FileResponse{Success: false, Message: err.Error()}
		}
		return FileResponse{Success: true, Message: "Directory created successfully"}

	case "move":
		err := MoveFile(op.Path, op.NewPath)
		if err != nil {
			return FileResponse{Success: false, Message: err.Error()}
		}
		return FileResponse{Success: true, Message: "File moved successfully"}

	case "copy":
		err := CopyFile(op.Path, op.NewPath)
		if err != nil {
			return FileResponse{Success: false, Message: err.Error()}
		}
		return FileResponse{Success: true, Message: "File copied successfully"}

	default:
		return FileResponse{Success: false, Message: "Unknown action"}
	}
}

func HandleFileOperationJSON(data []byte) ([]byte, error) {
	var op FileOperation
	if err := json.Unmarshal(data, &op); err != nil {
		return nil, err
	}

	response := HandleFileOperation(op)
	return json.Marshal(response)
}
