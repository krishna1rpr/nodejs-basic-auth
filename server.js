const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---

app.use(bodyParser.urlencoded({ extended: true })); // For parsing form data
app.use(bodyParser.json()); // For parsing JSON request bodies

// Serve static files (like your HTML pages if they are static)
app.use(express.static('public')); // Assuming your HTML files are in a 'public' folder

// Session Middleware
app.use(session({
    secret: 'your_super_secret_key', // Replace with a strong, unique secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Prevent client-side JS from accessing the cookie
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// --- User Data File Path ---
const USERS_FILE = path.join(__dirname, 'users.json');

// Function to read users from the JSON file
const readUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users file:', error.message);
        return []; // Return empty array if file doesn't exist or is invalid JSON
    }
};

// Function to write users to the JSON file
const writeUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing users file:', error.message);
    }
};

// --- Authentication Middleware ---
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next(); // User is authenticated, proceed to the next middleware/route handler
    } else {
        res.redirect('/login'); // User is not authenticated, redirect to login page
    }
};

// --- Routes ---

// Login Page Route (GET)
app.get('/login', (req, res) => {
    // Render your login HTML page
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login API (POST)
app.post('/login', (req, res) => { // Removed 'async' keyword
    const { email, password } = req.body;
    const users = readUsers();

    const user = users.find(u => u.email === email);

    // --- SECURITY RISK: PLAIN-TEXT PASSWORD COMPARISON ---
    if (user && user.password === password) { // Directly compare plain-text passwords
        req.session.user = { id: user.email, email: user.email }; // Store minimal user info in session
        res.redirect('/home'); // Redirect to home page on successful login
    } else {
        // You might want to render the login page again with an error message
        res.status(401).send('Invalid credentials. <a href="/login">Try again</a>');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/login');
    });
});

// Protected Routes - Apply isAuthenticated middleware
app.get('/home', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html')); // Your home page with workspace buttons
});

app.get('/getworkspaces', isAuthenticated, (req, res) => {
    // In a real application, fetch this from a more robust source.
    // For this example, let's hardcode some workspaces.
    const workspaces = [
        { id: 'dev', name: 'Development' },
        { id: 'qa', name: 'Quality Assurance' },
        { id: 'prod', name: 'Production' }
    ];
    res.json(workspaces);
});

app.get('/:workspace', isAuthenticated, (req, res) => {
    const { workspace } = req.params;
    // Simulate fetching data for the specific workspace
    const workspaceData = {
        dev: [
            { name: 'App Server Cert', certificate: 'cert_dev_app_server.pem' },
            { name: 'DB Connection Cert', certificate: 'cert_dev_db.pem' }
        ],
        qa: [
            { name: 'Test API Cert', certificate: 'cert_qa_api.pem' },
            { name: 'Load Balancer Cert', certificate: 'cert_qa_lb.pem' }
        ],
        prod: [
            { name: 'Web Server Cert', certificate: 'cert_prod_web_server.pem' },
            { name: 'Payment Gateway Cert', certificate: 'cert_prod_pg.pem' }
        ]
    };

    const data = workspaceData[workspace.toLowerCase()];

    if (data) {
        // Send a simple HTML table for demonstration.
        // In a real app, you'd likely render a proper template here.
        let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${workspace} Workspace Certificates</title>
                <style>
                    body { font-family: sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .back-button { margin-top: 20px; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>Certificates for ${workspace.toUpperCase()} Workspace</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Certificate File</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        data.forEach(item => {
            html += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.certificate}</td>
                        </tr>
            `;
        });
        html += `
                    </tbody>
                </table>
                <a href="/home" class="back-button">Back to Workspaces</a>
            </body>
            </html>
        `;
        res.send(html);
    } else {
        res.status(404).send('Workspace not found or no data available.');
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Access the login page at http://localhost:' + PORT + '/login');
});