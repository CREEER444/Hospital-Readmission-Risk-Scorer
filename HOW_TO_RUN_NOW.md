# How to Run This Project

## Backend Terminal

### Windows PowerShell / CMD
```bat
RUN_BACKEND_WINDOWS.bat
```

Or manually:
```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend should run at:
```text
http://localhost:5000
```

Test backend in browser:
```text
http://localhost:5000/api/health
```

## Frontend Terminal

### Windows PowerShell / CMD
```bat
RUN_FRONTEND_WINDOWS.bat
```

Or manually:
```bat
npm install
npm start
```

Frontend opens at:
```text
http://localhost:3000
```

## Important
Keep backend terminal open. Open a second terminal for frontend.
