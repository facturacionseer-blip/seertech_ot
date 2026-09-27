/* Tipos de trabajo de SEERTECH: servicios, datos del equipo y checklist de cada uno.
   Para agregar o cambiar tareas solo hay que editar este archivo. */
window.TIPOS_OT = {
  campana: {
    nombre: 'Limpieza de campana extractora', corto: 'Campana', icono: '🍳',
    tecTitulo: 'Datos técnicos de la campana',
    servicios: ['Limpieza de campana extractora', 'Limpieza de filtros de grasa', 'Limpieza de ductos',
      'Limpieza de motor / turbina', 'Desengrasado profundo', 'Lavado a presión'],
    campos: [
      { k: 'marca', l: 'Marca / Fabricante' }, { k: 'tipo', l: 'Tipo de campana', ph: 'Isla / Pared' },
      { k: 'dim', l: 'Dimensiones (L x A)', ph: 'metros' }, { k: 'filtros', l: 'N.° de filtros' },
      { k: 'tfiltro', l: 'Tipo de filtro', ph: 'Malla / Bafle' }, { k: 'motor', l: 'Motor / Turbina', ph: 'HP / Voltaje' },
      { k: 'ductos', l: 'Longitud de ductos', ph: 'metros' }, { k: 'ubic', l: 'Ubicación', ph: 'Cocina principal' }],
    tareas: [
      { cat: 'Inspección inicial', items: ['Evaluación del nivel de grasa acumulada', 'Verificación de estado general de la campana',
        'Revisión de accesos y área de trabajo', 'Protección de piso y equipos cercanos'] },
      { cat: 'Filtros', items: ['Retiro de filtros de grasa / baffle', 'Desengrasado en tina de inmersión', 'Cepillado y enjuague de filtros',
        'Secado y reinstalación de filtros', 'Verificación de filtros dañados o faltantes'] },
      { cat: 'Campana y superficies', items: ['Desengrasado de superficie interior de campana', 'Desengrasado de superficie exterior de campana',
        'Limpieza de canaletas colectoras de grasa', 'Limpieza de charola / recipiente de grasa', 'Pulido de acero inoxidable'] },
      { cat: 'Ductos y extracción', items: ['Limpieza de ductos accesibles', 'Revisión de acumulación de grasa en ductos',
        'Verificación de sellos y uniones de ductos', 'Revisión de compuertas de acceso'] },
      { cat: 'Motor y ventilador', items: ['Limpieza de aspas del extractor / turbina', 'Limpieza de carcasa del motor',
        'Verificación de funcionamiento del motor', 'Revisión de vibración y ruido anormal', 'Lubricación de rodamientos (si aplica)'] },
      { cat: 'Verificación final', items: ['Prueba de encendido y succión', 'Verificación de ausencia de residuos de grasa',
        'Revisión de conexiones eléctricas del sistema', 'Limpieza del área de trabajo post-servicio'] }
    ]
  },

  aire: {
    nombre: 'Aire acondicionado', corto: 'Aire acond.', icono: '❄️',
    tecTitulo: 'Datos del equipo de aire acondicionado',
    servicios: ['Mantenimiento preventivo', 'Limpieza profunda', 'Diagnóstico de falla', 'Reparación',
      'Carga de refrigerante', 'Instalación', 'Desinstalación / traslado'],
    campos: [
      { k: 'tipo', l: 'Tipo de equipo', ph: 'Mini split / Cassette / Paquete', lista: ['Mini split', 'Cassette', 'Piso techo', 'Paquete', 'Ventana', 'Central / ductado', 'Chiller'] },
      { k: 'marca', l: 'Marca' }, { k: 'modelo', l: 'Modelo' },
      { k: 'capacidad', l: 'Capacidad', ph: 'BTU / TR' },
      { k: 'refrigerante', l: 'Refrigerante', ph: 'R-410A / R-22 / R-32', lista: ['R-410A', 'R-32', 'R-22', 'R-407C', 'R-134a'] },
      { k: 'voltaje', l: 'Voltaje', ph: '120 / 240 V' }, { k: 'serie', l: 'N.° de serie' },
      { k: 'ubic', l: 'Ubicación', ph: 'Oficina / Sala' }],
    tareas: [
      { cat: 'Inspección inicial', items: ['Prueba de funcionamiento antes de intervenir', 'Revisión de accesos y protección del área',
        'Revisión de control remoto o termostato'] },
      { cat: 'Unidad interior', items: ['Limpieza o cambio de filtros', 'Limpieza de serpentín evaporador', 'Limpieza de turbina y aspas',
        'Limpieza de bandeja y drenaje de condensados', 'Revisión de aislamiento y sudoración'] },
      { cat: 'Unidad exterior', items: ['Limpieza de serpentín condensador', 'Revisión de ventilador del condensador', 'Revisión de compresor',
        'Revisión de base, soportes y tornillería'] },
      { cat: 'Refrigerante y desempeño', items: ['Lectura de presiones', 'Diferencia de temperatura entre retorno y suministro',
        'Verificación de sobrecalentamiento y subenfriamiento', 'Revisión de fugas'] },
      { cat: 'Sistema eléctrico y control', items: ['Apriete de conexiones y revisión de bornes', 'Medición de voltaje y corriente',
        'Revisión de capacitores y contactores', 'Verificación de comunicación entre unidades'] },
      { cat: 'Verificación final', items: ['Prueba final de enfriamiento', 'Verificación de ausencia de goteos y ruidos', 'Limpieza del área de trabajo'] }
    ]
  },

  electricidad: {
    nombre: 'Trabajo eléctrico', corto: 'Electricidad', icono: '⚡',
    tecTitulo: 'Datos de la instalación eléctrica',
    servicios: ['Diagnóstico eléctrico', 'Instalación eléctrica', 'Reparación de falla', 'Mantenimiento de tablero',
      'Balanceo de cargas', 'Iluminación', 'Tomacorrientes / circuitos', 'Puesta a tierra', 'Acometida'],
    campos: [
      { k: 'servicio', l: 'Tipo de servicio', ph: 'Monofásico / Trifásico', lista: ['Monofásico 120/240 V', 'Trifásico estrella 120/208 V', 'Trifásico delta 240 V (fase alta)', 'Trifásico 277/480 V'] },
      { k: 'voltaje', l: 'Voltaje medido', ph: 'V' }, { k: 'tablero', l: 'Tablero / ubicación' },
      { k: 'principal', l: 'Interruptor principal', ph: 'Amperios' }, { k: 'circuitos', l: 'N.° de circuitos' },
      { k: 'acometida', l: 'Calibre de acometida', ph: 'AWG / MCM' }, { k: 'medidor', l: 'Medidor / NIC' },
      { k: 'area', l: 'Área de trabajo' }],
    tareas: [
      { cat: 'Seguridad', items: ['Uso de equipo de protección personal', 'Desenergizado, bloqueo y etiquetado',
        'Verificación de ausencia de tensión', 'Señalización del área de trabajo'] },
      { cat: 'Acometida y medición', items: ['Identificación del tipo de servicio', 'Medición de voltajes entre fases y de fase a neutro',
        'Verificación de secuencia de fases', 'Identificación de la fase alta en sistemas delta', 'Estado del medidor y del interruptor principal'] },
      { cat: 'Tableros y protecciones', items: ['Inspección visual de tableros', 'Identificación y rotulado de circuitos',
        'Revisión de calibres y protecciones', 'Balance de cargas entre fases', 'Revisión de conexiones y termografía'] },
      { cat: 'Puesta a tierra', items: ['Verificación de puesta a tierra', 'Continuidad de conductores de protección',
        'Estado de protectores contra sobretensiones'] },
      { cat: 'Trabajos realizados', items: ['Instalación o cambio de protecciones', 'Tendido o cambio de conductores',
        'Conexiones y empalmes', 'Instalación de luminarias / tomacorrientes', 'Rotulado de circuitos modificados'] },
      { cat: 'Verificación final', items: ['Medición final de voltajes y corrientes', 'Prueba de funcionamiento de circuitos',
        'Cierre de tableros y retiro de bloqueos', 'Limpieza del área de trabajo'] }
    ]
  },

  refrigeracion: {
    nombre: 'Refrigeración / cuarto frío', corto: 'Refrigeración', icono: '🧊',
    tecTitulo: 'Datos del equipo de refrigeración',
    servicios: ['Mantenimiento preventivo de cuarto frío', 'Mantenimiento de refrigeración comercial', 'Diagnóstico de falla',
      'Reparación', 'Carga de refrigerante', 'Cambio de componente', 'Instalación'],
    campos: [
      { k: 'tipo', l: 'Tipo de equipo', ph: 'Cuarto frío / Vitrina', lista: ['Cuarto frío de conservación', 'Cuarto frío de congelación', 'Vitrina refrigerada', 'Refrigerador reach-in', 'Congelador', 'Máquina de hielo'] },
      { k: 'marca', l: 'Marca de la unidad' }, { k: 'modelo', l: 'Modelo' },
      { k: 'capacidad', l: 'Capacidad', ph: 'HP' },
      { k: 'refrigerante', l: 'Refrigerante', ph: 'R-404A / R-134a', lista: ['R-404A', 'R-134a', 'R-22', 'R-507', 'R-290', 'R-448A'] },
      { k: 'temp', l: 'Temperatura objetivo', ph: '°C' }, { k: 'controlador', l: 'Controlador', ph: 'Marca / modelo' },
      { k: 'ubic', l: 'Ubicación' }],
    tareas: [
      { cat: 'Inspección inicial', items: ['Registro de temperatura del cuarto y set point', 'Revisión de alarmas e historial del controlador',
        'Inspección visual de unidad, tuberías y aislamiento', 'Protección del producto y área de trabajo'] },
      { cat: 'Cuarto y puerta', items: ['Revisión de puerta, bisagras y cierre', 'Estado de burletes y empaques',
        'Revisión de cortina, resistencia de marco y paneles', 'Revisión de iluminación y acceso de emergencia'] },
      { cat: 'Evaporador', items: ['Limpieza de serpentín y carcasa', 'Revisión de ventiladores del evaporador',
        'Revisión del sistema de deshielo', 'Limpieza de bandeja y verificación de drenaje'] },
      { cat: 'Unidad condensadora', items: ['Limpieza de serpentín del condensador', 'Revisión de ventiladores del condensador',
        'Revisión de compresor', 'Revisión de nivel de aceite', 'Revisión de fugas de refrigerante o aceite'] },
      { cat: 'Sistema de refrigeración', items: ['Lectura de presiones de alta y de baja', 'Verificación de sobrecalentamiento y subenfriamiento',
        'Revisión de visor de líquido y filtro secador', 'Verificación de la válvula de expansión', 'Revisión de aislamiento de tuberías'] },
      { cat: 'Sistema eléctrico y control', items: ['Apriete de conexiones y revisión del tablero', 'Medición de voltaje y corriente',
        'Verificación de contactores y protecciones', 'Revisión de controlador y sensores', 'Prueba de alarmas'] },
      { cat: 'Verificación final', items: ['Prueba del ciclo de deshielo', 'Registro de temperatura final y operación estable', 'Limpieza del área de trabajo'] }
    ]
  },

  otro: {
    nombre: 'Otro trabajo', corto: 'Otro', icono: '🛠️', libre: true,
    tecTitulo: 'Datos del equipo o sistema',
    servicios: [],
    campos: [
      { k: 'equipo', l: 'Equipo / sistema' }, { k: 'marca', l: 'Marca' }, { k: 'modelo', l: 'Modelo' },
      { k: 'serie', l: 'N.° de serie' }, { k: 'ubic', l: 'Ubicación' }],
    tareas: []
  }
};
window.ORDEN_TIPOS = ['campana', 'aire', 'electricidad', 'refrigeracion', 'otro'];
