import "dotenv/config";
import express from "express";
import pg from "pg";
import joi from "joi";

const app = express()
const port = process.env.PORT
const {pool} = pg

const poll = new pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
})
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// Middleware Logging
app.use((req, res, next) => {
    const start = Date.now()
    res.on("finish", () => {
        const duration = Date.now() - start
        console.log({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`
        })
    })
    next()
})

//Response Envelope
function responseEnvelope(res, data, message = "Success", status = 200) {
    return res.status(status).json({
        success: true, message, data, error: null,
    })  
}
function errorResponse(res, message, status, details = null){
    return res.status(status).json({
        success: false, message, data: null, error: details,
    })  
}

// Joi Validation Schema
const biodataSchema = joi.object({
    id: Joi.number().integer().positiv(),
    nama: Joi.string().trim().min(2).max(100).required(),
    nim: Joi.string().trim().min(5).max(20).required(),
    kelas: Joi.string().trim().min(1).max(20).required(),
})  

const idSchema = joi.object({
    id: joi.number().integer().positive().required(),
})

//Middleware untuk validasi body
function validateBody(schema) {
    return (req, res, next) => {
        const {error, value} = schema.validate(req.body, {
            abortEarly: false, convert: true, allowUnknown: false
        });
        if (error) {
            return errorResponse(
                res,
                'Validasi Input Gagal',
                400,
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message
                }))
            )
        }
        req.body = value
        next()
    }
}

//Middleware untuk validasi parameter
function validateParams(schema) {
    return (req, res, next) => {
        const {error, value} = schema.validate(req.params);
        if (error) {
            return errorResponse(
                res,
                'Parameter tidak valid',
                400,
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message
                }))
            )
        }
        req.params = value
        next()
    }
}

app.get("/", async (req, res) => {
    const result = await pool.query('SELECT * FROM biodata ORDER BY id ASC')
    return responseEnvelope(res, result.rows, 'Data berhasil diambil')
})

app.post("/biodata", validateBody(mahasiswaSchema), async (req, res) => {
    const {id, nama, nim, kelas} = req.body
    const result = await pool.query(
        `INSERT INTO biodata (id, nama, nim, kelas)
        VALUES ($1, $2, $3, $4)
        RETURNING *`
        [id ?? null, nama, nim, kelas]
    )
    return responseEnvelope(res, 'Data berhasil ditambahkan', result.rows[0], 201)
})


