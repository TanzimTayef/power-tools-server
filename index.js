const express = require('express');
const cors = require('cors');
require('dotenv').config();
const PORT = process.env.PORT || 5000;


const app = express();

// middleware
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("Power Tools server is running!");
})

app.listen(PORT, () => {
   console.log('Server is running:', PORT)
})
