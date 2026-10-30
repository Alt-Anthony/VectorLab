// Inicio de Sesión
async function iniciarSesion(email, password) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Si el login es exitoso, redirige a la vista protegida
            window.location.href = '/priv/pages/dashboard.html';
        } else {
            alert(data.message || 'Error al iniciar sesión');
        }
    } catch (error) {
        console.error('Error en la petición de login:', error);
    }
}

// Registro de Estudiante
async function registrarEstudiante(nombre, carrera, email, password) {
    try {
        const res = await fetch('/api/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, carrera, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            console.log("Completo")
            alert('Registro exitoso. Bienvenido!');
            window.location.href = '/priv/pages/dashboard.html';
        } else {
            alert(data.message || 'Error al registrarse');
        }
    } catch (error) {
        console.error('Error en el registro:', error);
    }
}

function procesarLogin(event) {
    if (event) event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    iniciarSesion(email, password);
}

function procesarRegistro(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('regNombre').value.trim();
    const carrera = document.getElementById('regCarrera').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    registrarEstudiante(nombre, carrera, email, password);
}