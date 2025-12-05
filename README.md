# Attendify - Smart Attendance Management System

A modern, web-based attendance management system for educational institutions. Teachers mark attendance efficiently, and students track their attendance records in real-time.

## Features

### Teacher Portal
- Real-time attendance marking (Present/Absent)
- Bulk actions (Mark all present/absent)
- Session history with CSV export
- Filter and view past records
- Multi-semester support (1-8 semesters)

### Student Portal
- Attendance dashboard with visual progress
- Semester-wise filtering
- Subject-wise attendance breakdown
- Monthly attendance trends
- Attendance alerts (< 75% threshold)
- Recent activity log

## Tech Stack

**Frontend**: HTML5, CSS3, Vanilla JavaScript, Open Sans font  
**Backend**: .NET 8/9, Entity Framework Core, ASP.NET Identity  
**Database**: SQL Server  
**Auth**: JWT Tokens (HMAC-SHA512)

## Quick Setup

### Backend
```powershell
cd SmartAttendanceAPIs/SmartAttendance
dotnet restore
dotnet ef database update
dotnet run
# API runs on http://localhost:5014/api
```

### Frontend
```powershell
cd SmartAttendanceUI
# Update API_BASE in config.js if needed
python -m http.server 8000
# Open http://localhost:8000
```

**Prerequisites**: .NET 8+, SQL Server, modern browser

## API Endpoints

**Auth**: `POST /api/auth/login`, `POST /api/auth/register`  
**Students**: `GET /api/student`, `GET /api/student/me`  
**Teachers**: `GET /api/teacher`, `GET /api/teacher/me`  
**Attendance**: `POST /api/attendance/session`, `GET /api/attendance/history`  
**Subjects**: `GET /api/subject`, `POST /api/subject`

## Usage

### Teachers
1. Login with email/password
2. Select Class, Semester, Subject
3. Mark attendance (P/A for each student)
4. Submit and download CSV if needed
5. View history in "All Attendance" tab

### Students
1. Register with roll number and course
2. Login to view dashboard
3. Select semester to filter stats
4. View subject-wise, monthly, and overall attendance
5. Get alerts if attendance falls below 75%

## Database

**Students**: RollNo, FullName, Email, ClassName  
**Attendance**: StudentName, Status, CourseName, Semester, Year, SubjectId  
**Teachers**: FullName, Email, Password (hashed)

## Configuration

### Course Semesters
- B.Tech: 8 semesters
- BCA: 6 semesters
- MCA: 4 semesters
- M.Tech: 4 semesters

### Attendance Thresholds
- Good Standing: ≥ 75%
- Below Requirement: 60-75%
- At Risk: < 60%

## Troubleshooting

**Port 5014 in use?**
```powershell
netstat -ano | findstr :5014
taskkill /PID <PID> /F
```

**Database connection error?**
- Check SQL Server is running
- Update connection string in `appsettings.json`
- Run `dotnet ef database update`

**403 Forbidden on teacher endpoints?**
- Re-login to get updated token with role claims
- Ensure logged in as Teacher role

**CORS errors?**
- Verify `API_BASE` in `config.js` matches your backend URL

## Security

- JWT Token authentication with role-based authorization
- ASP.NET Identity for secure user management
- Password hashing with salt
- CORS enabled

## Repository

- **GitHub**: [Attendify-SmartAttendance](https://github.com/Aditi2705/Attendify-SmartAttendance)
- **Owner**: Aditi2705
- **Branch**: main

---

**Version**: 1.0.0 | **Updated**: December 2025
