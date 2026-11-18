
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
        const contenedor = document.getElementById('listaEstudiantes');
        if (!contenedor) return;

        const estudiantes = response.data || [];
        if (estudiantes.length === 0) {
            contenedor.innerHTML = '<tr><td colspan="7">No hay estudiantes registrados</td></tr>';
            return;
        }
        contenedor.innerHTML = estudiantes.map(est => `
            <tr>
                <td>${est.id}</td>
                <td>${est.nombre}</td>
                <td>${est.email}</td>
                <td>${est.carrera || 'N/A'}</td>
                <td>${est.fecha_creacion ? new Date(est.fecha_creacion).toLocaleDateString('es-PE') : 'N/A'}</td>
                <td>${est.creado_por || 'Autoregistro'}</td>
                <td>
                    <button onclick="eliminarEstudiante(${est.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar la lista de estudiantes:', error);
    }
}

// Listar administradores en el panel admin
async function cargarAdministradores() {
    try {
        const res = await fetch('/api/estudiantes/administradores');

        if (res.status === 403) {
            alert('Acceso denegado: Se requieren permisos de Administrador.');
            window.location.href = 'dashboard.html';
            return;
        }

        const response = await res.json();
        const contenedor = document.getElementById('listaAdministradores');
        if (!contenedor) return;

        const administradores = response.data || [];

        if (administradores.length === 0) {
            contenedor.innerHTML = '<tr><td colspan="4">No hay administradores registrados</td></tr>';
            return;
        }

        contenedor.innerHTML = administradores.map(admin => {
            const fecha = admin.fecha_creacion
                ? new Date(admin.fecha_creacion).toLocaleDateString('es-PE')
                : 'N/A';
            const creadoPor = admin.creado_por_nombre
                ? `${admin.creado_por_nombre} (${admin.creado_por_email})`
                : 'Sistema (Inicial)';

            return `
                <tr>
                    <td>${admin.nombre}</td>
                    <td>${admin.email}</td>
                    <td>${fecha}</td>
                    <td>${creadoPor}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error al cargar la lista de administradores:', error);
    }
}

// Mostrar u ocultar la tabla de estudiantes
function alternarListaEstudiantes() {
    const tablaContenedor = document.getElementById('contenedorTablaEstudiantes');
    const botonToggle = document.getElementById('btnToggleEstudiantes');
    const botonActualizar = document.getElementById('btnActualizarEstudiantes');
    if (!tablaContenedor || !botonToggle) return;

    const estaOculta = tablaContenedor.hidden;
    tablaContenedor.hidden = !estaOculta;
    if (botonActualizar) botonActualizar.hidden = !estaOculta;
    botonToggle.textContent = estaOculta ? 'Ocultar Estudiantes' : 'Ver Estudiantes';

    if (estaOculta) {
        cargarEstudiantes();
    }
}

// Mostrar u ocultar la tabla de administradores
function alternarListaAdmins() {
    const tablaContenedor = document.getElementById('contenedorTablaAdmins');
    const botonToggle = document.getElementById('btnToggleAdmins');
    const botonActualizar = document.getElementById('btnActualizarAdmins');
    if (!tablaContenedor || !botonToggle) return;

    const estaOculta = tablaContenedor.hidden;
    tablaContenedor.hidden = !estaOculta;
    if (botonActualizar) botonActualizar.hidden = !estaOculta;
    botonToggle.textContent = estaOculta ? 'Ocultar Administradores' : 'Ver Administradores';
    if (estaOculta) {
        cargarAdministradores();
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