import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap'
import { FaSignInAlt, FaUser } from 'react-icons/fa'
import { api, setAuthToken } from '../../services/apiClient'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Normalizar credenciales
      const emailNorm = String(email).trim().toLowerCase()
      const passwordNorm = String(password).trim()
      // Llama directamente al backend (/auth/login)
      const { data } = await api.post('/auth/login', { email: emailNorm, password: passwordNorm })
      const token = data?.token || data?.access_token || data?.accessToken
      if (token) {
        localStorage.setItem('auth_token', token)
        setAuthToken(token)
      }
      // Redirigir según rol: acepta 'role' (string) o 'rolId' (numérico)
      const role = data?.user?.role
      const rolId = data?.user?.rolId
      let target = '/'
      if (role) {
        if (role === 'admin') target = '/admin'
        else if (role === 'despachador' || role === 'dispatcher') target = '/despachador'
        else target = '/usuario'
      } else if (typeof rolId === 'number') {
        // Mapa sugerido por esquema: 1 admin, 2 despachador, 3 conductor, 4 usuario
        if (rolId === 1) target = '/admin'
        else if (rolId === 2) target = '/despachador'
        else target = '/usuario'
      } else {
        target = '/usuario'
      }
      navigate(target)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Credenciales inválidas.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ background: 'linear-gradient(180deg,rgb(217, 164, 164),rgb(162, 226, 159)))' }}>
      <Container fluid className="min-vh-100 d-flex align-items-center py-4">
        <Row className="justify-content-center flex-grow-1">
          <Col xs={11} sm={10} md={8} lg={5} xl={4} className="mx-auto" style={{ maxWidth: 520 }}>
            <Card className="card-soft" style={{ background: 'rgba(255,255,255,.96)', backdropFilter: 'saturate(120%) blur(3px)' }}>
              <Card.Body className="p-4 p-md-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="icon-pill"><FaSignInAlt/></div>
                  <h1 className="h5 m-0">Iniciar sesión</h1>
                </div>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="tu@correo.com" />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Contraseña</Form.Label>
                    <Form.Control type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required placeholder="••••••••" />
                  </Form.Group>
                  <div className="d-grid d-md-flex gap-2">
                    <Button type="submit" disabled={loading} className="btn-accent">
                      {loading ? 'Ingresando...' : 'Ingresar'}
                    </Button>
                    <Link to="/register" className="btn btn-sun">Crear cuenta</Link>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  )
}

export default Login
