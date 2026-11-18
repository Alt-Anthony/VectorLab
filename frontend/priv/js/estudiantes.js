// Listar estudiantes en el panel admin
async function cargarEstudiantes() {
    try {
        const res = await fetch('/api/estudiantes');

        if (res.status === 403) {
            alert('Acceso denegado: Se requieren permisos de Administrador.');
            window.location.href = 'dashboard.html';
            return;
        }

        const response = await res.json();
        const estudiantes = response.data;

        const contenedor = document.getElementById('listaEstudiantes');
        if (!contenedor) return;

        if (estudiantes.length === 0) {
            contenedor.innerHTML = '<tr><td colspan="6">No hay estudiantes registrados</td></tr>';
            return;
        }
        contenedor.innerHTML = estudiantes.map(est => `
            <tr>
                <td>${est.id}</td>
                <td>${est.nombre}</td>
                <td>${est.email}</td>
                <td>${est.carrera || 'N/A'}</td>
                <td>${est.fecha_creacion ? new Date(est.fecha_creacion).toLocaleDateString():'N/A'}</td>
                <td>
                    <button onclick="eliminarEstudiante(${est.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar la lista de estudiantes:', error);
    }
}

// Eliminar un estudiante por ID
async function eliminarEstudiante(id) {
    if (!confirm('¿Seguro que deseas eliminar este estudiante?')) return;

    try {
        const res = await fetch(`/api/estudiantes/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            alert('Estudiante eliminado');
            cargarEstudiantes();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error al eliminar estudiante:', error);
    }
}

// Crear un nuevo Admin
async function crearNuevoAdmin(nombre, email, password) {
    try {
        const res = await fetch('/api/estudiantes/nuevo-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert('Nuevo administrador creado correctamente');
            document.getElementById('adminForm').reset();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error al crear admin:', error);
    }
}

function procesarNuevoAdmin(event) {
    event.preventDefault();
    const nombre = document.getElementById('adminNombre').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    crearNuevoAdmin(nombre, email, password);
}

// Cargar la lista automáticamente al abrir la página
cargarEstudiantes();