# Smart Attendance Management System

A modern, web-based attendance management system designed for educational institutions. This system allows teachers to mark attendance efficiently and students to track their attendance records in real-time.

## Features

### Teacher Portal
- **Attendance Session Management**: Create and manage attendance sessions for multiple classes
- **Real-time Attendance Marking**: Mark student attendance as Present (P) or Absent (A)
- **Bulk Actions**: Mark all students as present or absent with one click
- **Session History**: View, filter, and download past attendance records
- **CSV Export**: Download attendance data for archival or further analysis
- **Multi-semester Support**: Handle semesters 1-8 with flexible configuration
- **Subject & Class Management**: Organize attendance by subject and class

### Student Portal
- **Attendance Dashboard**: View overall attendance percentage with visual progress indicators
- **Semester-wise Filtering**: Select specific semesters to view attendance breakdown
- **Subject-wise Analytics**: See attendance stats for each subject individually
- **Monthly Attendance Tracking**: Monitor attendance trends by month
- **Attendance Warnings**: Receive alerts when attendance falls below 75% threshold
- **Recent Activity Log**: Track latest attendance records

## Technology Stack

### Frontend
- **HTML5, CSS3, JavaScript** (Vanilla)
- **Font**: Open Sans (Google Fonts)
- **Responsive Design**: Mobile-friendly UI
- **No build tools required**: Pure vanilla JavaScript for simplicity

### Backend
- **.NET 8/9 Web API**
- **Entity Framework Core** (ORM)
- **ASP.NET Identity** (Authentication & Authorization)
- **SQL Server** (Database)
- **AutoMapper** (DTO mapping)
- **JWT Tokens** (HMAC-SHA512 based authentication)

### Database
- **SQL Server** (`AttendanceDb`)
- **Tables**: Students, Teachers, Attendance, Subjects, AppUsers

## Project Structure

```
SmartAttendanceUI/
├── index.html                 # Login & Registration page
├── teacher-portal.html        # Teacher attendance marking interface
├── student-profile.html       # Student attendance dashboard
├── style.css                  # Login page styles
├── teacher-portal.css         # Teacher portal styles
├── student-profile.css        # Student profile styles
├── script.js                  # Login/registration logic
├── teacher-portal.js          # Teacher portal functionality
├── student-profile.js         # Student dashboard logic
├── config.js                  # Global configuration
└── README.md                  # This file

SmartAttendanceAPIs/SmartAttendance/
├── Controllers/
│   ├── AuthController.cs      # Authentication & token generation
│   ├── StudentController.cs   # Student API endpoints
│   ├── TeacherController.cs   # Teacher API endpoints
│   ├── AttendanceController.cs# Attendance marking & history
│   └── SubjectController.cs   # Subject management
├── Models/
│   ├── Student.cs
│   ├── Teacher.cs
│   ├── Attendance.cs
│   ├── Subject.cs
│   └── AppUser.cs
├── DTOs/
│   ├── Student/CreateStudentDto.cs
│   ├── Attendance/AttendanceSessionDto.cs
│   └── ...
├── Repositories/
│   ├── IStudentRepository.cs
│   ├── IAttendanceRepository.cs
│   └── ...
├── Services/
│   ├── TokenService.cs        # JWT token generation
│   └── ...
├── Migrations/
│   └── [EF Core migrations]
├── Mapping/
│   └── MappingProfile.cs      # AutoMapper configuration
├── Program.cs                 # Application startup
└── appsettings.json           # Configuration file
```

## Setup Instructions

### Prerequisites
- **.NET 8 or 9 SDK** installed
- **SQL Server** installed and running
- **Node.js** (optional, for static file serving)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Backend Setup

1. **Navigate to the backend directory**:
   ```powershell
   cd D:\SmartAttendanceUI\SmartAttendanceAPIs\SmartAttendance
   ```

2. **Update database connection string** in `appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=ADITI\\SQLEXPRESS;Database=AttendanceDb;Trusted_Connection=true;"
   }
   ```

3. **Restore NuGet packages**:
   ```powershell
   dotnet restore
   ```

4. **Apply database migrations**:
   ```powershell
   dotnet ef database update
   ```

5. **Build and run the API**:
   ```powershell
   dotnet build
   dotnet run
   ```
   The API will be available at `http://localhost:5014/api`

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```powershell
   cd D:\SmartAttendanceUI
   ```

2. **Update API base URL** in `config.js` (if needed):
   ```javascript
   window.API_BASE = 'http://localhost:5014/api';
   ```

3. **Start a local web server** (e.g., using Python):
   ```powershell
   python -m http.server 8000
   ```
   Or use VS Code's Live Server extension.

4. **Open in browser**:
   ```
   http://localhost:8000
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` — Student/Teacher login
- `POST /api/auth/register` — Student registration

### Students
- `GET /api/student` — Get all students
- `GET /api/student/me` — Get logged-in student details
- `GET /api/student/{id}` — Get specific student

### Teachers
- `GET /api/teacher` — Get all teachers
- `GET /api/teacher/me` — Get logged-in teacher details

### Attendance
- `POST /api/attendance/session` — Record attendance session
- `GET /api/attendance/history` — Get attendance history
- `GET /api/attendance/history/public` — Get public attendance (debug endpoint)

### Subjects
- `GET /api/subject` — Get all subjects
- `POST /api/subject` — Create new subject

## Usage Guide

### For Teachers

1. **Login**: Use your teacher email and password on the login page
2. **Mark Attendance**:
   - Select Class, Semester, and Subject from dropdowns
   - Click "Start Attendance" to load students
   - Mark each student as Present (P) or Absent (A)
   - Use "All P" or "All A" buttons for bulk actions
3. **View History**:
   - Click "All Attendance" tab to see past sessions
   - Use filters to search by class or subject
   - Download attendance records as CSV
   - Click eye icon to view session details

### For Students

1. **Register**: Create a new account with roll number, email, and course
2. **Login**: Use your email and registered password
3. **View Profile**:
   - See personal information and current semester
   - Check overall attendance percentage
   - Select semesters to filter attendance stats
   - View subject-wise, semester-wise, and monthly attendance
   - Check recent attendance activity
   - Receive alerts if attendance is below 75%

## Key Features Details

### Course Duration Configuration
- **B.Tech**: 8 semesters
- **BCA**: 6 semesters
- **MCA**: 4 semesters
- **M.Tech**: 4 semesters

### Attendance Threshold
- **Default**: 75%
- **Good Standing**: ≥ 75%
- **Below Requirement**: 60-75%
- **At Risk**: < 60%

### Security Features
- **JWT Token Authentication** (HMAC-SHA512)
- **Role-based Authorization** (Student, Teacher, Admin)
- **ASP.NET Identity** for secure user management
- **Password hashing** with salt
- **CORS enabled** for cross-origin requests

## Database Schema

### Students Table
```sql
- Id (int, PK)
- RollNo (varchar)
- FullName (varchar)
- Email (varchar, unique)
- ClassName (varchar)
- UserId (FK to AspNetUsers)
```

### Attendance Table
```sql
- Id (int, PK)
- StudentName (varchar)
- Status (varchar: 'P'/'A')
- CourseName (varchar)
- Semester (int)
- Year (int)
- SubjectId (FK)
- Date (datetime)
```

### Teachers Table
```sql
- Id (int, PK)
- FullName (varchar)
- Email (varchar, unique)
- Password (varchar, hashed)
- UserId (FK to AspNetUsers)
```

## Error Handling

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error (check logs)

## Troubleshooting

### Port Already in Use
```powershell
# Kill process on port 5014
netstat -ano | findstr :5014
taskkill /PID <PID> /F
```

### Database Connection Issues
- Verify SQL Server is running
- Check connection string in `appsettings.json`
- Ensure database exists and migrations are applied

### CORS Errors
- Verify API_BASE URL in `config.js`
- Check CORS configuration in `Program.cs`

### 403 Forbidden on Teacher Endpoints
- Ensure you're logged in as a teacher
- JWT token must include "Teacher" role
- Re-login after backend changes to get updated token

## Future Enhancements

- [ ] Admin dashboard for system management
- [ ] Biometric/QR code attendance marking
- [ ] Email notifications for attendance alerts
- [ ] Advanced attendance analytics & reports
- [ ] Mobile app (iOS/Android)
- [ ] Parent portal for attendance updates
- [ ] Integration with learning management systems
- [ ] SMS notifications

## Contributing

1. Clone the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact & Support

- **Project Repository**: [SmartAttendanceAPIs](https://github.com/Aditi2705/SmartAttendanceAPIs)
- **Branch**: `kk-restore-registration`
- **Issues**: Report bugs and request features via GitHub Issues

## Acknowledgments

- Built with **.NET Core** and **vanilla JavaScript**
- Styled with **CSS3** and **Open Sans** typography
- Database powered by **SQL Server** and **Entity Framework Core**
- Authentication secured with **JWT tokens**

---

**Last Updated**: December 2025
**Version**: 1.0.0
