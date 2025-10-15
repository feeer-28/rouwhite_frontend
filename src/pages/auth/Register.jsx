import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap'
import { FaUserPlus } from 'react-icons/fa'
import { api, setAuthToken } from '../../services/apiClient'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    identificacion: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors(null)

    // Validaciones mínimas del lado del cliente según tu validator de VineJS
    const clientErrors = {}
    if (!form.nombres || form.nombres.trim().length < 3) clientErrors.nombre = 'Mínimo 3 caracteres'
    if (!form.apellidos || form.apellidos.trim().length < 3) clientErrors.apellido = 'Mínimo 3 caracteres'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) clientErrors.email = 'Email inválido'
    // Password: min 8, con mayúscula, minúscula, número y especial
    const passwordValid = typeof form.password === 'string' &&
      form.password.length >= 8 &&
      /[A-Z]/.test(form.password) &&
      /[a-z]/.test(form.password) &&
      /\d/.test(form.password) &&
      /[^\da-zA-Z]/.test(form.password)
    if (!passwordValid) clientErrors.password = 'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo'
    // Identificación: solo números y mínimo 3
    if (!form.identificacion || form.identificacion.trim().length < 3 || !/^\d+$/.test(form.identificacion)) {
      clientErrors.identificacion = 'Solo números, mínimo 3 dígitos'
    }
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors)
      setError('Por favor corrige los campos marcados')
      return
    }
    setLoading(true)
    try {
      // Llama directamente al backend (/auth/register) con los campos requeridos
      await api.post('/auth/register', {
        nombre: form.nombres,
        apellido: form.apellidos,
        identificacion: form.identificacion,
        email: form.email,
        password: form.password,
        // avatarUrl opcional si lo deseas enviar más adelante
        // avatarUrl: ''
      })
      // Tras crear cuenta, iniciar sesión automáticamente y redirigir al panel de usuario
      try {
        // Normalizar credenciales igual que en Login.jsx
        const emailNorm = String(form.email).trim().toLowerCase()
        const passwordNorm = String(form.password).trim()
        const { data } = await api.post('/auth/login', {
          email: emailNorm,
          password: passwordNorm,
        })
        const token = data?.token || data?.access_token || data?.accessToken
        if (token) {
          localStorage.setItem('auth_token', token)
          setAuthToken(token)
        }
        // Independientemente de role, por flujo solicitado ir al panel de usuario
        navigate('/usuario')
      } catch (loginErr) {
        // Si por alguna razón el login inmediato falla, enviamos al login manual
        console.error('Auto-login after register failed:', loginErr)
        navigate('/login')
      }
    } catch (err) {
      // Mostrar mensaje y detalles de validación si existen
      const status = err?.response?.status
      const data = err?.response?.data
      console.error('Register error:', data || err)
      let userMsg = data?.message || 'No se pudo crear la cuenta. Intenta nuevamente.'

      // Manejo específico para duplicados (unique constraint) del lado de DB
      // Buscamos patrones comunes en el texto de error para mapear a campos
      const rawError = String(data?.error || '')
      const byField = {}
      if (status === 409 || /duplicate key value/i.test(rawError) || /unique constraint/i.test(rawError)) {
        // Identificación duplicada
        if (/usuarios_identificacion_key/i.test(rawError) || /identificacion/i.test(rawError)) {
          byField.identificacion = 'La identificación ya está registrada'
          userMsg = 'La identificación ya está registrada'
        }
        // Email duplicado
        if (/usuarios_email_key/i.test(rawError) || /email/i.test(rawError)) {
          byField.email = 'El email ya está registrado'
          // Si no hay otro mensaje más específico
          if (!data?.message || userMsg === data?.message) {
            userMsg = 'El email ya está registrado'
          }
        }
        // Rol u otros campos podrían también tener unique, extender si aplica
      }

      // Adonis suele devolver errors como array: [{ field, message, rule }]
      const arrayErrors = data?.errors || data?.messages?.errors
      if (Array.isArray(arrayErrors)) {
        for (const e of arrayErrors) {
          const key = e.field || 'general'
          byField[key] = byField[key] ? `${byField[key]}, ${e.message}` : e.message
        }
      } else if (data?.errors && typeof data.errors === 'object') {
        Object.assign(byField, data.errors)
      }

      if (Object.keys(byField).length) {
        setFieldErrors(byField)
      }
      setError(userMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ background: 'linear-gradient(180deg,rgb(227, 214, 206),rgb(212, 212, 183) 140, 61))' }}>
      <Container fluid className="min-vh-100 d-flex align-items-center py-4">
        <Row className="justify-content-center flex-grow-1">
          <Col xs={11} sm={10} md={8} lg={6} xl={5} className="mx-auto" style={{ maxWidth: 560 }}>
            <Card className="card-soft" style={{ background: 'rgba(255,255,255,.96)', backdropFilter: 'saturate(120%) blur(3px)' }}>
              <Card.Body className="p-4 p-md-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="icon-pill"><FaUserPlus/></div>
                  <h1 className="h4 m-0">Crear cuenta</h1>
                </div>
                {error && <Alert variant="danger">{error}</Alert>}
                {fieldErrors && (
                  <Alert variant="warning">
                    <ul className="mb-0 small">
                      {Object.entries(fieldErrors).map(([key, val]) => (
                        <li key={key}><strong>{key}:</strong> {Array.isArray(val) ? val.join(', ') : String(val)}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                <Form onSubmit={handleSubmit}>
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="mb-1">Nombres</Form.Label>
                        <Form.Control size="sm" name="nombres" value={form.nombres} onChange={handleChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="mb-1">Apellidos</Form.Label>
                        <Form.Control size="sm" name="apellidos" value={form.apellidos} onChange={handleChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="mb-1">Identificación</Form.Label>
                        <Form.Control size="sm" name="identificacion" value={form.identificacion} onChange={handleChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="mb-1">Email</Form.Label>
                        <Form.Control size="sm" type="email" name="email" value={form.email} onChange={handleChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label className="mb-1">Contraseña</Form.Label>
                        <Form.Control size="sm" type="password" name="password" value={form.password} onChange={handleChange} required />
                        <div className="form-text">Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.</div>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <div className="d-grid d-md-flex gap-2">
                        <Button size="sm" disabled={loading} type="submit" className="btn-accent">
                          {loading ? 'Creando...' : 'Crear cuenta'}
                        </Button>
                        <Button size="sm" variant="outline-secondary" type="button" onClick={() => navigate('/login')}>Ya tengo cuenta</Button>
                      </div>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  )
}

export default Register
