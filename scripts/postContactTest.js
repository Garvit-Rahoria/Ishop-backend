const http = require("http");

const data = JSON.stringify({
    firstName: "Garvit",
    lastName: "Test",
    email: "garvitrahoria2004@gmail.com",
    phone: "9999999999",
    country: "India",
    subject: "API contact test",
    message: "Ye API se gaya hai - form working.",
    newsletter: false,
});

const req = http.request(
    {
        hostname: "127.0.0.1",
        port: 5000,
        path: "/api/contact",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
        },
    },
    (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => {
            console.log("STATUS", res.statusCode);
            console.log(b);
        });
    }
);

req.on("error", (e) => console.error("ERR", e.message));
req.write(data);
req.end();
