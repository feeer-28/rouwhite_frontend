function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-light border-top py-3 mt-4">
      <div className="container text-center text-muted">
        <small>© {year} Rouwhite. Todos los derechos reservados.</small>
      </div>
    </footer>
  )
}

export default Footer
