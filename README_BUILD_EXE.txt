HOW TO BUILD EXE

1. In your project root, create a folder named:

   backend

2. Copy these backend files into backend folder:

   app.py
   patients_data.json   (optional)
   hospital.db          (optional)
   models folder        (optional if you have model files)

Example structure:

hospital-readmission-scorer-sms-feature/
  src/
  public/
  build/
  main.js
  package.json
  backend/
    app.py
    hospital.db
    patients_data.json
    models/

3. Install packages:

   npm install
   npm install electron electron-builder concurrently wait-on --save-dev

4. Build EXE:

   npm run dist

5. Find installer inside:

   dist/

IMPORTANT:
- The EXE starts Flask automatically using Python.
- Python must be installed on the computer.
- Backend Python packages must be installed:
  pip install flask flask-cors numpy pandas joblib
- If you use SQLite version:
  pip install flask flask-cors numpy pandas joblib
