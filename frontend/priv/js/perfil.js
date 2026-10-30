// Obtener datos del perfil actual
async function cargarPerfil() {
    try {
        const res = await fetch('/api/perfil');

        if (res.status === 401) {
            // Si no está autenticado, la API devuelve 401 y redirigimos al login
            window.location.href = '../../pub/pages/login.html';
            return;
        }

        const response = await res.json();
        const usuario = response.data;

        // Renderizar datos en los elementos HTML del DOM
        document.getElementById('usuarioNombre').textContent = usuario.nombre;
        document.getElementById('usuarioCarrera').textContent = usuario.carrera;
        document.getElementById('usuarioEmail').textContent = usuario.email;
        document.getElementById('usuarioRol').textContent = usuario.rol;

        //Campos de edicion
        if (document.getElementById('editNombre')) {
            document.getElementById('editNombre').value = usuario.nombre || '';
        }
        if (document.getElementById('editCarrera')) {
            document.getElementById('editCarrera').value = usuario.carrera || usuario.carrera_postula || '';
        }

        // Mostrar el botón al panel de administración solo si el usuario es admin
        const btnAdmin = document.getElementById('btnPanelAdmin');
        if (btnAdmin) {
            btnAdmin.style.display = (usuario.rol === 'admin') ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Error al obtener el perfil:', error);
    }
}

// Actualizar nombre o carrera
async function actualizarPerfil(nombre, carrera) {
    try {
        const res = await fetch('/api/perfil', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, carrera })
        });

        const data = await res.json();

        if (res.ok) {
            alert('Perfil actualizado correctamente');
            cargarPerfil();
        } else {
            alert(data.message || 'Error al actualizar perfil');
        }
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
    }
}

function procesarActualizacionPerfil(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('editNombre') ? document.getElementById('editNombre').value.trim() : '';
    const carrera = document.getElementById('editCarrera') ? document.getElementById('editCarrera').value.trim() : '';

    actualizarPerfil(nombre, carrera);
}

// Cargar automáticamente al ejecutar el script
cargarPerfil();