(function () {
    async function pedir(url, opciones) {
        const respuesta = await fetch(url, opciones);
        const json = await respuesta.json();
        return { ok: respuesta.ok, json };
    }

    async function cargarProgreso() {
        const texto = document.getElementById('textoProgreso');
        const barra = document.getElementById('barraProgreso');
        const contenedor = document.getElementById('progresoCursos');
        try {
            const { ok, json } = await pedir('/api/panel/progreso');
            if (!ok) throw new Error(json.message);
            const d = json.data;
            texto.textContent = `Resueltas: ${d.resueltas} de ${d.total_preguntas} preguntas · Intentos totales: ${d.total_intentos}`;
            barra.max = Math.max(d.total_preguntas, 1);
            barra.value = d.resueltas;

            contenedor.replaceChildren();
            for (const c of d.por_curso) {
                const p = document.createElement('p');
                p.textContent = `${c.curso}: ${c.resueltas} de ${c.total}`;
                const b = document.createElement('progress');
                b.max = Math.max(c.total, 1);
                b.value = c.resueltas;
                contenedor.append(p, b);
            }
        } catch (error) {
            texto.textContent = 'No se pudo cargar el progreso.';
        }
    }

    async function cargarHistorial() {
        const texto = document.getElementById('textoHistorial');
        const tabla = document.getElementById('tablaHistorial');
        const cuerpo = tabla.querySelector('tbody');
        try {
            const { ok, json } = await pedir('/api/panel/historial');
            if (!ok) throw new Error(json.message);
            if (json.data.length === 0) {
                texto.textContent = 'Aún no has resuelto preguntas.';
                return;
            }
            cuerpo.replaceChildren();
            for (const i of json.data) {
                const limpio = i.enunciado.replace(/\$/g, '').replace(/\s+/g, ' ');
                const resumen = limpio.length > 70 ? limpio.slice(0, 70) + '…' : limpio;
                const celdas = [
                    `#${i.codigo_banco} ${resumen}`,
                    i.curso,
                    i.tema,
                    i.respuesta ?? '-',
                    i.es_correcta ? 'Correcta' : 'Incorrecta',
                    new Date(i.fecha_creacion).toLocaleString('es-PE')
                ];
                const fila = document.createElement('tr');
                for (const valor of celdas) {
                    const td = document.createElement('td');
                    td.textContent = valor;
                    fila.appendChild(td);
                }
                cuerpo.appendChild(fila);
            }
            texto.hidden = true;
            tabla.hidden = false;
        } catch (error) {
            texto.textContent = 'No se pudo cargar el historial.';
        }
    }

    document.getElementById('formPassword').addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const mensaje = document.getElementById('mensajePassword');
        const cuerpo = {
            passwordActual: document.getElementById('passActual').value.trim(),
            passwordNueva: document.getElementById('passNueva').value.trim(),
            passwordConfirmar: document.getElementById('passConfirmar').value.trim()
        };
        try {
            const { ok, json } = await pedir('/api/panel/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo)
            });
            mensaje.textContent = json.message;
            if (ok) evento.target.reset();
        } catch (error) {
            mensaje.textContent = 'Error de conexión. Intenta de nuevo.';
        }
    });

    cargarProgreso();
    cargarHistorial();
})();