const express = require('express')
require('dotenv').config();
const app = express();
const cors = require('cors');
const { userRoutes, postingRoutes } = require('./routes');
const PORT = process.env.PORT;
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use('/users', userRoutes);
app.use('/postings', postingRoutes);

app.listen(PORT, () => {
    console.log("Server is running on port: " + PORT)
})