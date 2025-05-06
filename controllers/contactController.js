const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración de nodemailer (puedes cambiar esto según tu proveedor de correo)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Maneja la solicitud de contacto y envía un correo electrónico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.sendContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validar datos
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Todos los campos son obligatorios' 
      });
    }

    // En modo desarrollo, podemos simular el envío sin configurar un servidor de correo
    if (process.env.NODE_ENV !== 'production') {
      console.log('Modo desarrollo: simulando envío de correo');
      console.log('De:', email);
      console.log('Nombre:', name);
      console.log('Mensaje:', message);
      
      // Devolver una respuesta exitosa simulada
      return res.status(200).json({
        success: true,
        message: 'Mensaje recibido (modo desarrollo)'
      });
    }

    // Configurar el correo electrónico
    const mailOptions = {
      from: email,
      to: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
      subject: `Nuevo mensaje de contacto de ${name}`,
      html: `
        <h3>Nuevo mensaje de contacto</h3>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${message}</p>
      `
    };

    // Enviar el correo electrónico
    await transporter.sendMail(mailOptions);

    // Enviar respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Mensaje enviado correctamente'
    });
  } catch (error) {
    console.error('Error al enviar mensaje de contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje de contacto',
      error: error.message
    });
  }
}; 