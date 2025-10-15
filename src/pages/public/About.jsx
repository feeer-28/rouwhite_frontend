function About() {
  const team = [
    { name: 'Fernanda Gonzalez Paz', role: 'Project manager y desarrollador Full Stack', github: 'https://github.com/feeer-28', photo: 'https://ytqnzrgjnkaarjpatydy.supabase.co/storage/v1/object/sign/imagenesIntegrantes/Imagen%20de%20WhatsApp%202025-10-13%20a%20las%2000.46.30_856493e2.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85NzY5MWVhOS00NGY5LTQwMGItOWZkZC03NWZlZjdmZGUwMDkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc0ludGVncmFudGVzL0ltYWdlbiBkZSBXaGF0c0FwcCAyMDI1LTEwLTEzIGEgbGFzIDAwLjQ2LjMwXzg1NjQ5M2UyLmpwZyIsImlhdCI6MTc2MDMzNDcxMiwiZXhwIjoxNzkxODcwNzEyfQ.wFbRdWwL2GBlldbnjlONfh5Tht7uNk9iKWpZ6nYpSzs', desc: '' },
    { name: 'Yesid Ortiz', role: 'Desarrollador Full Stack', github: 'https://github.com/user2', photo: 'https://ytqnzrgjnkaarjpatydy.supabase.co/storage/v1/object/sign/imagenesIntegrantes/Imagen%20de%20WhatsApp%202025-10-13%20a%20las%2000.46.30_205bc48f.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85NzY5MWVhOS00NGY5LTQwMGItOWZkZC03NWZlZjdmZGUwMDkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc0ludGVncmFudGVzL0ltYWdlbiBkZSBXaGF0c0FwcCAyMDI1LTEwLTEzIGEgbGFzIDAwLjQ2LjMwXzIwNWJjNDhmLmpwZyIsImlhdCI6MTc2MDMzNDUxMiwiZXhwIjoxNzkxODcwNTEyfQ.DReBA49EbvI5CNkR62TNIeHk_fw0RIEjhikx_1PjnRM', desc: 'Diseño de APIs y bases de datos.' },
    { name: 'Nicolas Benavides', role: 'Desarrollador Full Stack', github: 'https://github.com/user3', photo: 'https://ytqnzrgjnkaarjpatydy.supabase.co/storage/v1/object/sign/imagenesIntegrantes/Imagen%20de%20WhatsApp%202025-10-13%20a%20las%2000.46.30_23f5bc40.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85NzY5MWVhOS00NGY5LTQwMGItOWZkZC03NWZlZjdmZGUwMDkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZW5lc0ludGVncmFudGVzL0ltYWdlbiBkZSBXaGF0c0FwcCAyMDI1LTEwLTEzIGEgbGFzIDAwLjQ2LjMwXzIzZjViYzQwLmpwZyIsImlhdCI6MTc2MDMzNDYzOSwiZXhwIjoxNzkxODcwNjM5fQ.qBTJqzwpi9Q_UCpWOhSbiEIVoBB4pUe5K54PrN6utnY', desc: 'Geodatos y visualización con Leaflet.' },
    { name: 'Ferney Muñoz', role: 'Desarrollador mobile', github: 'https://github.com/user4', photo: 'https://via.placeholder.com/120', desc: 'Pruebas, automatización y calidad.' },
    { name: 'Jerardo Ojeda', role: 'Desarrollador mobile', github: 'https://github.com/user5', photo: 'https://via.placeholder.com/120', desc: 'CI/CD, despliegues y monitoreo.' },

  ]

  return (
    <section>
      <div className="container py-5">
        <h1 className="mb-4">Sobre nosotros</h1>
        <p className="lead">Somos el equipo Rouwhite. Construimos una plataforma para visualizar y gestionar rutas urbanas, paraderos y buses en tiempo real.</p>

        {/* Info solicitada para el Landing */}
        <div className="card border-0 shadow mb-4">
          <div
            className="card-header"
            style={{ background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))', color: '#1b1b1b', fontWeight: 600 }}
          >
            ¿Qué es Rouwhite?
          </div>
          <div className="card-body">
            <div className="mb-3">
              <strong>Descripción breve:</strong>{' '}
              <span>
                Es una aplicación de gestión de rutas de transporte público, diseñada para mejorar la eficiencia y la experiencia de los usuarios.
              </span>
            </div>
            <div className="mb-3">
              <strong>Problema que resuelve:</strong>{' '}
              <span>
                La falta de información en tiempo real sobre rutas y paraderos, lo que genera inconvenientes en la planificación de los viajes.
              </span>
            </div>
            <div className="mb-3">
              <strong>Beneficios:</strong>
              <ul className="mt-2 mb-0">
                <li>Información en tiempo real sobre la ubicación de los buses.</li>
                <li>Visualización de rutas y paraderos en un mapa interactivo.</li>
                <li>Estimación de tiempos de llegada y posibilidad de agregar rutas a favoritos.</li>
                <li>Información turística de la ciudad.</li>
              </ul>
            </div>
            <div>
              <strong>Valor agregado:</strong>{' '}
              <span>
                La app permite a los usuarios planificar sus viajes con mayor precisión, reduciendo tiempos de espera y mejorando la experiencia de transporte.
              </span>
            </div>
          </div>
        </div>

        <div className="row g-4 mt-2">
          {team.map((m, idx) => (
            <div className="col-12 col-md-6 col-lg-4" key={idx}>
              <div className="card h-100">
                <div className="card-body d-flex gap-3">
                  <img src={m.photo} alt={m.name} width={96} height={96} className="rounded" />
                  <div>
                    <h5 className="mb-1">{m.name}</h5>
                    <div className="text-muted small mb-2">{m.role}</div>
                    <p className="mb-2 small">{m.desc}</p>
                    <a href={m.github} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-dark">GitHub</a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default About
