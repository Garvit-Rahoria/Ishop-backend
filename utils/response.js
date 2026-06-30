// success response 
const sendSuccess = (res, message = "Success", data = {}, meta = {}) =>{
    return res.status(200).json({
        success:true,
        message,
        data,
        meta
    })
}

const sendOk = (res, message = "Send Ok") =>{
    return res.status(200).json({
        success:true,
        message
    })
}

// created response 
const sendCreated = (res, message = "Created Successfully") =>{
    return res.status(201).json({
        success:true,
        message
    })
}

// bad request (validation errors)
const sendBadRequest = (res, message = "Bad Request") =>{
    return res.status(400).json({
        success:false,
        message
    })
}

// not found 
const sendNotFound = (res, message = "Resourse Not Found") =>{
    return res.status(404).json({
        success:false,
        message
    })
}

// conflict (already exists) 
const sendConflict = (res, message = "Data Already Exists") =>{
    return res.status(409).json({
        success:false,
        message
    })
}

// server error 
const sendServerError = (res, error) =>{
    console.log(error)
    return res.status(500).json({
        success:false,
        message : "Internal server error"
    })
}

module.exports = {
    sendSuccess,
    sendServerError,
    sendBadRequest,
    sendConflict,
    sendNotFound,
    sendCreated,
    sendOk

}