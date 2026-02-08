const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const smtpUser = defineSecret("SMTP_USER");
const smtpPass = defineSecret("SMTP_PASS");
const recaptchaSecret = defineSecret("RECAPTCHA_SECRET");

exports.sendContact = onRequest(
  { secrets: [smtpUser, smtpPass, recaptchaSecret], region: "europe-west1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const { nombre, email, mensaje, captchaToken } = req.body || {};
    const nameValue = String(nombre || "").trim();
    const emailValue = String(email || "").trim();
    const messageValue = String(mensaje || "").trim();
    const captchaValue = String(captchaToken || "").trim();

    if (!nameValue || !emailValue || !messageValue || !captchaValue) {
      res.status(400).json({ ok: false, error: "Missing fields" });
      return;
    }

    try {
      const verifyResponse = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            secret: recaptchaSecret.value(),
            response: captchaValue
          })
        }
      );
      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        res.status(400).json({ ok: false, error: "Captcha failed" });
        return;
      }
    } catch (error) {
      console.error("Captcha error", error);
      res.status(500).json({ ok: false, error: "Captcha error" });
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser.value(),
        pass: smtpPass.value()
      }
    });

    try {
      await transporter.sendMail({
        from: `Begovi <${smtpUser.value()}>`,
        to: "b.govima@gmail.com",
        replyTo: emailValue,
        subject: "Nuevo mensaje desde begovi.art",
        text: [
          `Nombre: ${nameValue}`,
          `Email: ${emailValue}`,
          "",
          messageValue
        ].join("\n")
      });

      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Send error", error);
      res.status(500).json({ ok: false, error: "Email failed" });
    }
  }
);
