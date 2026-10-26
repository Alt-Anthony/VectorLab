const API_URL = '/api/estudiantes';

const form = document.getElementById('studentForm');
const studentId = document.getElementById('studentId');
const nombre = document.getElementById('nombre');
const email = document.getElementById('email');
const carrera = document.getElementById('carrera');
const tableBody = document.getElementById('studentTableBody');
const message = document.getElementById('message');
const formTitle = document.getElementById('formTitle');
const saveButton = document.getElementById('saveButton');
const cancelButton = document.getElementById('cancelButton');
const refreshButton = document.getElementById('refreshButton');

function mostrarMensaje(texto, tipo) {
  message.textContent = texto;
  message.className = tipo;
}

// ---------- LEER (GET) ----------
async function cargarEstudiantes() {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Error al obtener estudiantes');
    }
    mostrarEstudiantes(result.data);
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, 'error');
  }
}

function mostrarEstudiantes(estudiantes) {
  tableBody.innerHTML = '';

  if (estudiantes.length === 0) {
    const row = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'No hay estudiantes registrados';
    row.appendChild(td);
    tableBody.appendChild(row);
    return;
  }

  estudiantes.forEach(estudiante => {
    const row = document.createElement('tr');

    const valores = [
      estudiante.id,
      estudiante.nombre,
      estudiante.email,
      estudiante.carrera_postula,
      new Date(estudiante.creado_en).toLocaleString()
    ];

    valores.forEach(valor => {
      const td = document.createElement('td');
      td.textContent = valor;
      row.appendChild(td);
    });

    const acciones = document.createElement('td');

    const btnEditar = document.createElement('button');
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => editarEstudiante(estudiante.id));

    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.className = 'danger';
    btnEliminar.addEventListener('click', () => eliminarEstudiante(estudiante.id));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnEliminar);
    row.appendChild(acciones);

    tableBody.appendChild(row);
  });
}

// ---------- CREAR (POST) / ACTUALIZAR (PUT) ----------
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = {
    nombre: nombre.value.trim(),
    email: email.value.trim(),
    carrera_postula: carrera.value.trim()
  };

  const editando = Boolean(studentId.value);
  const url = editando ? `${API_URL}/${studentId.value}` : API_URL;
  const method = editando ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Error en la operación');
    }

    mostrarMensaje(result.message, 'success');
    limpiarFormulario();
    await cargarEstudiantes();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, 'error');
  }
});

// ---------- EDITAR: carga los datos en el formulario ----------
async function editarEstudiante(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message);
    }

    const estudiante = result.data;
    studentId.value = estudiante.id;
    nombre.value = estudiante.nombre;
    email.value = estudiante.email;
    carrera.value = estudiante.carrera_postula;

    formTitle.textContent = 'Editar estudiante';
    saveButton.textContent = 'Actualizar estudiante';
    cancelButton.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, 'error');
  }
}

// ---------- ELIMINAR (DELETE) ----------
async function eliminarEstudiante(id) {
  if (!confirm('¿Está seguro de eliminar este estudiante?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message);
    }

    mostrarMensaje(result.message, 'success');
    await cargarEstudiantes();
  } catch (error) {
    console.error(error);
    mostrarMensaje(error.message, 'error');
  }
}

function limpiarFormulario() {
  form.reset();
  studentId.value = '';
  formTitle.textContent = 'Registrar estudiante';
  saveButton.textContent = 'Registrar estudiante';
  cancelButton.style.display = 'none';
}

cancelButton.addEventListener('click', limpiarFormulario);
refreshButton.addEventListener('click', cargarEstudiantes);

cargarEstudiantes();