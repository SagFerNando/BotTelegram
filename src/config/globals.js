//////////////////////////////////////////////////
//CONSTANTES Y DETALLES DE PRECIOS Y OFERTAS
/////////////////////////////////////////////////

const NEGOCIO = {
  precios: {
    mensual: {
      mxn: 120,
      usd: 7.07,
      dias: 30,
    },
  },

  ofertas: {
    primerMes: {
      activa: false,
      mxn: 120,
      usd: 7.07,
      meses: 1,
      descripcion: "!! Primer mes por tiempo limitado !! 🔥",
    },

    masMeses: {
      activa: true,
      mxn: 200,
      usd: 11.8,
      meses: 2,
      descripcion: "<<<<<< Dos meses por precio especial >>>>>> 😈😈😈",
    },
  },
};

module.exports = NEGOCIO;
