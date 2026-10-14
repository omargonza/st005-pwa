const ITEMS_ORIGINALES = [
  { nombre: "Cooler CPU compatible con AM5", cantidad: 1, precio: 50200 },
  { nombre: "Pasta térmica Arctic MX-4", cantidad: 1, precio: 8800 },
  { nombre: "Ventilador RGB de gabinete", cantidad: 1, precio: 11876 },
  { nombre: "Mano de obra técnica", cantidad: 1, precio: 45000 },
];

const IVA = 0.21;
const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const botonesNavegacion = [...document.querySelectorAll(".nav-item")];
const pantallas = [...document.querySelectorAll(".screen")];
const cuerpoPresupuesto = document.querySelector("#lineas-presupuesto");
const mensajePresupuesto = document.querySelector("#mensaje-presupuesto");
let pantallaPrincipalAnterior = "diagnostico";

function mostrarPantalla(id, moverFoco = false) {
  const pantallaDestino = pantallas.find((pantalla) => pantalla.dataset.screen === id);
  if (!pantallaDestino) return;

  pantallas.forEach((pantalla) => {
    const activa = pantalla === pantallaDestino;
    pantalla.hidden = !activa;
    pantalla.classList.toggle("is-active", activa);
  });

  botonesNavegacion.forEach((boton) => {
    const activo = boton.dataset.target === id;
    boton.classList.toggle("is-active", activo);
    if (activo) boton.setAttribute("aria-current", "page");
    else boton.removeAttribute("aria-current");
  });

  if (id !== "expediente") pantallaPrincipalAnterior = id;
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (moverFoco) {
    const titulo = pantallaDestino.querySelector("h2");
    titulo?.setAttribute("tabindex", "-1");
    titulo?.focus({ preventScroll: true });
  }
}

botonesNavegacion.forEach((boton) => {
  boton.addEventListener("click", () => {
    const destino = boton.dataset.target;
    history.replaceState({ screen: destino }, "");
    mostrarPantalla(destino);
  });
});

document.querySelectorAll("[data-open-expediente]").forEach((boton) => {
  boton.addEventListener("click", () => {
    history.pushState({ screen: "expediente", previous: pantallaPrincipalAnterior }, "");
    mostrarPantalla("expediente", true);
  });
});

document.querySelectorAll("[data-close-expediente]").forEach((boton) => {
  boton.addEventListener("click", () => {
    if (history.state?.screen === "expediente") history.back();
    else mostrarPantalla(pantallaPrincipalAnterior, true);
  });
});

window.addEventListener("popstate", (evento) => {
  mostrarPantalla(evento.state?.screen || pantallaPrincipalAnterior, true);
});

history.replaceState({ screen: "diagnostico" }, "");

function crearFilasPresupuesto() {
  cuerpoPresupuesto.innerHTML = ITEMS_ORIGINALES.map((item, indice) => `
    <tr data-item="${indice}">
      <td data-label="Concepto">${item.nombre}</td>
      <td data-label="Cantidad">
        <input class="budget-input budget-input--qty" type="number" min="0" step="1" inputmode="numeric" value="${item.cantidad}" aria-label="Cantidad de ${item.nombre}" data-field="cantidad">
      </td>
      <td data-label="Precio unitario">
        <label class="price-input">
          <span aria-hidden="true">$</span>
          <input class="budget-input budget-input--price" type="number" min="0" step="0.01" inputmode="decimal" value="${item.precio}" aria-label="Precio unitario de ${item.nombre}" data-field="precio">
        </label>
      </td>
      <td class="line-total" data-label="Importe">${formatoMoneda.format(item.cantidad * item.precio)}</td>
    </tr>
  `).join("");
}

function valorNumerico(input) {
  const texto = input.value.trim();
  const valor = Number(texto);
  const cantidadInvalida = input.dataset.field === "cantidad" && !Number.isInteger(valor);
  const invalido = texto === "" || !Number.isFinite(valor) || valor < 0 || cantidadInvalida;
  input.setAttribute("aria-invalid", String(invalido));
  return invalido ? 0 : valor;
}

function recalcularPresupuesto() {
  let subtotal = 0;
  let hayErrores = false;

  cuerpoPresupuesto.querySelectorAll("tr").forEach((fila) => {
    const inputCantidad = fila.querySelector('[data-field="cantidad"]');
    const inputPrecio = fila.querySelector('[data-field="precio"]');
    const cantidad = valorNumerico(inputCantidad);
    const precio = valorNumerico(inputPrecio);
    hayErrores ||= inputCantidad.getAttribute("aria-invalid") === "true" || inputPrecio.getAttribute("aria-invalid") === "true";
    const importe = cantidad * precio;
    subtotal += importe;
    fila.querySelector(".line-total").textContent = formatoMoneda.format(importe);
  });

  const iva = subtotal * IVA;
  document.querySelector("#subtotal").textContent = formatoMoneda.format(subtotal);
  document.querySelector("#iva").textContent = formatoMoneda.format(iva);
  document.querySelector("#total").textContent = formatoMoneda.format(subtotal + iva);
  mensajePresupuesto.textContent = hayErrores ? "Revisá los campos marcados: sólo se admiten valores iguales o mayores que cero." : "";
}

function normalizarCampo(input) {
  if (input.getAttribute("aria-invalid") !== "true") return;
  input.value = "0";
  input.setAttribute("aria-invalid", "false");
  recalcularPresupuesto();
  mensajePresupuesto.textContent = "El valor incorrecto se reemplazó por cero.";
}

function restaurarPresupuesto() {
  crearFilasPresupuesto();
  recalcularPresupuesto();
  mensajePresupuesto.textContent = "Se restauraron los valores originales.";
}

cuerpoPresupuesto.addEventListener("input", recalcularPresupuesto);
cuerpoPresupuesto.addEventListener("change", (evento) => {
  if (evento.target.matches(".budget-input")) normalizarCampo(evento.target);
});
cuerpoPresupuesto.addEventListener("keydown", (evento) => {
  if (evento.target.matches(".budget-input") && ["-", "+", "e", "E"].includes(evento.key)) evento.preventDefault();
});
document.querySelector("#restaurar-presupuesto").addEventListener("click", restaurarPresupuesto);

const slides = [...document.querySelectorAll(".slide")];
const progreso = [...document.querySelectorAll(".presentation-progress span")];
const botonAnterior = document.querySelector("#slide-anterior");
const botonSiguiente = document.querySelector("#slide-siguiente");
const contadorSlide = document.querySelector("#contador-slide");
let slideActual = 0;

function mostrarSlide(indice) {
  slideActual = Math.max(0, Math.min(indice, slides.length - 1));
  slides.forEach((slide, posicion) => {
    const activa = posicion === slideActual;
    slide.hidden = !activa;
    slide.classList.toggle("is-active", activa);
  });
  progreso.forEach((paso, posicion) => paso.classList.toggle("is-active", posicion <= slideActual));
  botonAnterior.disabled = slideActual === 0;
  botonSiguiente.disabled = slideActual === slides.length - 1;
  contadorSlide.textContent = `${slideActual + 1} de ${slides.length}`;
}

botonAnterior.addEventListener("click", () => mostrarSlide(slideActual - 1));
botonSiguiente.addEventListener("click", () => mostrarSlide(slideActual + 1));

const comprobacionesRecursos = new Map();
const recursosSolicitadosAlCache = new Set();

function solicitarCacheRecurso(ruta) {
  if (!("serviceWorker" in navigator) || recursosSolicitadosAlCache.has(ruta)) return;
  recursosSolicitadosAlCache.add(ruta);
  navigator.serviceWorker.ready.then((registro) => {
    registro.active?.postMessage({ type: "CACHE_RESOURCE", url: new URL(ruta, location.href).href });
  }).catch(() => {});
}

function tipoDeContenidoValido(ruta, tipo, contenido) {
  if (!contenido || contenido.includes("text/html")) return false;
  if (tipo === "image") return contenido.startsWith("image/");
  if (ruta.endsWith(".pdf")) return contenido.includes("application/pdf");
  if (ruta.endsWith(".xlsx")) {
    return contenido.includes("spreadsheetml") || contenido.includes("application/zip") || contenido.includes("application/octet-stream");
  }
  return true;
}

async function imagenDecodificable(respuesta) {
  try {
    const blob = await respuesta.clone().blob();
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
      return true;
    }

    return await new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const imagen = new Image();
      imagen.onload = () => { URL.revokeObjectURL(url); resolve(true); };
      imagen.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      imagen.src = url;
    });
  } catch {
    return false;
  }
}

async function respuestaValida(ruta, tipo, respuesta) {
  if (!respuesta?.ok) return false;
  const contenido = respuesta.headers.get("content-type") || "";
  if (!tipoDeContenidoValido(ruta, tipo, contenido)) return false;
  return tipo !== "image" || imagenDecodificable(respuesta);
}

function comprobarRecurso(ruta, tipo) {
  if (comprobacionesRecursos.has(ruta)) return comprobacionesRecursos.get(ruta);
  const comprobacion = (async () => {
    if ("caches" in window) {
      const almacenada = await caches.match(ruta);
      if (await respuestaValida(ruta, tipo, almacenada)) return true;
    }
    try {
      const respuesta = await fetch(ruta, { cache: "no-store" });
      return respuestaValida(ruta, tipo, respuesta);
    } catch {
      return false;
    }
  })();
  comprobacionesRecursos.set(ruta, comprobacion);
  return comprobacion;
}

async function actualizarRecursos() {
  const grupos = [...document.querySelectorAll("[data-resource-src]")];
  await Promise.all(grupos.map(async (grupo) => {
    const ruta = grupo.dataset.resourceSrc;
    const disponible = await comprobarRecurso(ruta, grupo.dataset.resourceType);
    grupo.classList.toggle("is-available", disponible);
    grupo.querySelectorAll("[data-resource-action]").forEach((accion) => { accion.hidden = !disponible; });
    grupo.querySelectorAll("[data-resource-pending]").forEach((pendiente) => { pendiente.hidden = disponible; });
    grupo.querySelectorAll("[data-resource-label]").forEach((etiqueta) => {
      etiqueta.textContent = disponible ? "Disponible offline" : "Recurso pendiente";
      etiqueta.classList.toggle("is-available", disponible);
    });
    grupo.querySelectorAll("img[data-src]").forEach((imagen) => {
      if (disponible && !imagen.src) imagen.src = imagen.dataset.src;
    });
    if (disponible) solicitarCacheRecurso(ruta);
    document.querySelectorAll("[data-resource-status-for]").forEach((estado) => {
      if (estado.dataset.resourceStatusFor !== ruta) return;
      estado.textContent = disponible ? "Disponible" : "Pendiente";
      estado.classList.toggle("is-available", disponible);
    });
  }));
}

const visor = document.querySelector("#visor-imagen");
const imagenVisor = document.querySelector("#visor-imagen-contenido");
const tituloVisor = document.querySelector("#visor-titulo");
const enlaceVisor = document.querySelector("#visor-enlace");

document.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-image-opener]");
  if (!boton) return;
  const imagen = boton.querySelector("img");
  imagenVisor.src = imagen.src;
  imagenVisor.alt = imagen.alt;
  tituloVisor.textContent = imagen.alt;
  enlaceVisor.href = imagen.src;
  if (typeof visor.showModal === "function") visor.showModal();
  else window.open(imagen.src, "_blank", "noopener");
});

document.querySelector("[data-close-viewer]").addEventListener("click", () => visor.close());
visor.addEventListener("click", (evento) => {
  if (evento.target === visor) visor.close();
});

crearFilasPresupuesto();
recalcularPresupuesto();
mostrarSlide(0);
actualizarRecursos();

window.addEventListener("online", () => {
  comprobacionesRecursos.clear();
  actualizarRecursos();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", {
      scope: "./",
      updateViaCache: "none",
    }).then((registro) => registro.update()).catch(() => {
        document.documentElement.dataset.serviceWorker = "no-disponible";
      });
  });
}
