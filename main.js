const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

let backendProcess = null;

function getBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend");
  }
  return __dirname;
}

function getPythonCommand() {
  if (process.platform === "win32") {
    return "py";
  }
  return "python3";
}

function startBackend() {
  const backendDir = getBackendDir();
  const appPyPath = path.join(backendDir, "app.py");

  if (!fs.existsSync(appPyPath)) {
    dialog.showErrorBox(
      "Backend Missing",
      `app.py was not found here:\n${appPyPath}\n\nMake sure backend files are copied into the backend folder before building EXE.`
    );
    return;
  }

  const pythonCommand = getPythonCommand();

  backendProcess = spawn(pythonCommand, ["app.py"], {
    cwd: backendDir,
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1"
    }
  });

  backendProcess.stdout.on("data", (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on("error", (error) => {
    dialog.showErrorBox(
      "Backend Start Failed",
      `Flask backend could not start.\n\nError: ${error.message}\n\nInstall Python and required packages, then try again.`
    );
  });

  backendProcess.on("close", (code) => {
    console.log(`Backend exited with code ${code}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "build", "index.html"));
  } else {
    win.loadURL("http://localhost:3000");
  }
}

app.whenReady().then(() => {
  startBackend();

  setTimeout(() => {
    createWindow();
  }, 4500);
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
