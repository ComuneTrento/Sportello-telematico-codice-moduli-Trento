//Versione: 1.0
//detta l'esecuzione o meno dei controlli runtime
var ControlloAbilitato = true,
        //tempo in ms che può prendere al massimo per la validazione dati
        tempoMassimo = 400,
        //conterrà l'elenco delle regole
        rulesarray,
        //indirizzo dove recuperare i dati ente
        WEB_SERVICE_ENTE = '/sportello_telematico/dati_comune/',
        //predisposta al contenimento delle informazioni sull'ente
        infoEnte,
        //indica se eseguire o meno gli alerts, utile in caso di validaizione finale dei dati
        doAlerts = true,
        regoleGiaRotte = undefined,
        form = document.getElementById('modulo'),
        //GFMaplet
        //Versione 5 o 6

        //tipoToponimo 1 o 2 (1 se classe e descrizione sono divisi)
        tipoToponimo = 2,
        //tipoCivico 1 o 2 (1 se numero e subalterno sono divisi)
        tipoCivico = 2,
        //Carattere separatore del civico e del subalterno
        separatoreCivico = '/',
        //Campi utilizzati per creare il filtro in GFMaplet
        campoClasse = "",
        campoToponimo = "TOPONIMO",
        campoCivico = "CIVICO",
        campoSubalterno = "",
        campoComune = "comune",
        upload_caller = '',
        bypass_check = false,
        impostazioni_validazioni = undefined,
        today = get_today_date(); //Data di oggi in formato gg/mm/aaaa

var EventManager = {
    subscribe: function(event, fn) {
        $(this).bind(event, fn);
    },
    unsubscribe: function(event, fn) {
        $(this).unbind(event, fn);
    },
    publish: function(event) {
        $(this).trigger(event);
    }
};

//la carico qui in cima in quanto deve recuperare una riorsa all'allocamento, ci
//vuole tempo
var img_loader = $('<img style="margin-right: 10px;" />');
img_loader.attr('src', '/sites/all/modules/custom/sportello_telematico/imgs/in_invio.gif');

//ottiene le informazioni circa un ente partento dal suo codice amministrativo

function getCodiceComune(codice) {
  if (codice === null) {
    return undefined;
  }

  codice = codice.toUpperCase();

  return $.parseJSON($.ajax({
    //async: false,
    cache: false,
    url: WEB_SERVICE_ENTE + codice,
    dataType: 'json'
  }).responseText);
}

//dato un codice provincia popola una detemrinata select con l'elenco dei comuni di tale provincia

query_callback = {};

function popola_select(comuni, id_lista_comuni, stati) {
  var output, codice;
  if (stati) {
    output = '<option value="">Choose a country...</option>';
  } else {
    output = '<option value="">Scegli un comune...</option>';
  }

  for (codice in comuni) {
    output += '<option value="' + comuni[codice] + '">' + comuni[codice] + '</option>';
  }

  $('#' + id_lista_comuni).html(output);

  validator.tree[id_lista_comuni].check();

}

var comuni_cache = {},
    pending_request = {};

function getComuniFromProvincia(codice_provincia, id_lista_comuni) {
  if (codice_provincia) {
    codice_provincia = codice_provincia.toUpperCase();
    var cache = comuni_cache[codice_provincia],
        node = validator.tree[id_lista_comuni];

    if (!node.label) {
      node.label = "Scegli comune...";
    }

    if (!pending_request[codice_provincia]) {
      pending_request[codice_provincia] = $.ajax({
        dataType: 'json',
        url: '/sportello_telematico/elenco_comuni_provincia/' + codice_provincia
      });
    }

    if(pending_request[codice_provincia]) {
      pending_request[codice_provincia].then(function(comuni) {
        if (!comuni_cache[codice_provincia]) {
          var tmp = {};
          for (var property in comuni) {
              if (comuni.hasOwnProperty(property)) {
                  tmp[comuni[property]] = comuni[property];
              }
          }

          comuni = tmp;
          comuni_cache[codice_provincia] = comuni;
        }

        node.set_options(comuni_cache[codice_provincia]);
        node.check();
      });
    }
  }
}


function isFunction(object) {
  return typeof object === 'function';
}

//funzione di caricamento della form

function loadForm(all_prefix) {
  showLoader("Inizializzazione modulo in corso...");
  //indico che lo script ha iniziato la sua esecuzione
  $('#GLOBO_MyJobIsDone').val('FALSE');
  //impostiamo la data secondo il formato gg/mm/aaaa
  var data = validator.tree['Data'],
  data_pdf = validator.tree['Data_PDF'];

  data.set_value(today);
  data.check();

  data_pdf.set_value(today);
  data_pdf.check();

  var ente = getParameter('Ente');

  if (ente !== undefined || ente !== '') {
    //@TODO: RISCRIVERE LA LOGICA DI SELEZIONE DEI CAMPI
    //Manda una richiesta sincrona sul comune e la salva in E
    $.ajax({
      url: WEB_SERVICE_ENTE + ente,
      dataType: 'html'
    }).done(function (data) {
      var ente = validator.tree['Ente'],
      ente_data = $.parseJSON(data),
      luogo = validator.tree['Luogo'],
      luogo_pdf = validator.tree['Luogo_PDF'];

      $('input[name~=CodiceISTAT]').val(ente_data[1]);
      luogo_pdf.set_value(ente_data[0]);
      luogo_pdf.check();


      if (ente != undefined) {
        ente.set_value(ente_data[0]);
        ente.check();
      }
      luogo.set_value(ente_data[0]);
      luogo.check();

      //Precompile section
      if (!getParameter('GLOBO_recupera_dati')) {
        $('div[type*="Immobile"]').each(function (index) {
          var prefix = $(this).find('input').prop('id').split('_')[0];
          validator.tree[prefix + '_CatComune'].set_value(getParameter('Ente').toUpperCase().split('_')[1]);
          validator.tree[prefix + '_CatComune'].default_value = getParameter('Ente').toUpperCase().split('_')[1];
          validator.tree[prefix + '_CatComune'].old_value = getParameter('Ente').toUpperCase().split('_')[1];
          validator.tree[prefix + '_Provincia'].set_value(ente_data[2]);
          validator.tree[prefix + '_Provincia'].default_value = ente_data[2];
          validator.tree[prefix + '_Provincia'].old_value = ente_data[2];
          validator.tree[prefix + '_Comune'].set_value(ente_data[0]);
          validator.tree[prefix + '_Comune'].default_value = ente_data[0];
          validator.tree[prefix + '_Comune'].old_value = ente_data[0];
          validator.tree[prefix + '_CatComune'].check();
          validator.tree[prefix + '_Comune'].check();
          validator.tree[prefix + '_Provincia'].check();
        });
}

});
} else {
  ente = false;
  infoEnte = false;
}


  // Precompilazione dei campi in base ai parametri passati sull'URL
  var codice_modulo = $('meta[name="GLOBO_modulo"]').attr('codice_modulo'),
  dichiarazione_cf = getParameter('GLOBO_DichiarazioneCF'),
  codice_istanza = getParameter('GLOBO_Codice_istanza');

  if (dichiarazione_cf !== null) {
    $('input[name="DichiarazioneCF"]').val(dichiarazione_cf);
  }

  if (codice_istanza !== null) {
    var codice_istanza_val = validator.tree['Codice_istanza'];
    if (codice_istanza_val !== undefined) {
      codice_istanza_val.default_value = codice_istanza;
      codice_istanza_val.check();
    }
  }
  var meta_padre = document.getElementById('GLOBO_id_padre'),
  meta_codice = document.getElementById('GLOBO_modulo_c' + codice_modulo),
  meta_recupero_dati = document.getElementById('GLOBO_recupera_dati');

  // Recupera l'ID Padre
  if (meta_padre !== undefined) {
    meta_padre.value = getParameter('GLOBO_id_padre');
  }
  if (meta_codice !== undefined) {
    meta_codice.value = "destinatario_amministrazione = '" + ente + "'";
  }


  // Precarico i controlli del modulo in base ai parametri passati sull'url
  var recuperoDati = getParameter('GLOBO_recupera_dati');
  if (recuperoDati) {
    if (meta_recupero_dati !== undefined) {
      meta_recupero_dati.value = recuperoDati;
    }
    recuperaDatiCompilazione(recuperoDati);

    if (typeof afterRecupero !== 'undefined') { /*Eval is evil!*/
      afterRecupero();
    }
  }

  if (meta_padre !== undefined) {
    recuperaDatiFrame('Metadati');
  }

  var dettagli_procura = getParameter('GLOBO_accetta_procura');
  if (dettagli_procura == 'SI') {
    $('table#Tabella_Procura').css('display', 'block');
    $('table#Tabella_Procura').css('pd4ml-display', 'block');
  }

  update_codicefiscale();

  /*Autoload dati frame*/
  if (all_prefix !== undefined) {
    var prefix,
    i = all_prefix.length - 1,
    id = $('[name="GLOBO_id_padre"]').val();
    id_att = $('[name="GLOBO_recupera_dati"]').val();
    // Recupera i dati
    if (id && !id_att) {
      do {
        prefix = all_prefix.shift();
        campiDaJSon('/sportello_telematico/carica_dati_frame/' + id + '/' + prefix, undefined, true);
      } while (i--);
    }
  }

  impostazioni_validazioni = caricaImpostazioniValidazioni();

  if (impostazioni_validazioni['abilitazione']['Visualizza toponomastica in mappa'] != "Visualizza toponomastica in mappa") {
    $('button').filter(function () {
      return /^Immobile[0-99]*_MappaToponomastica$/.test(this.id);
    }).css('display', 'none');
  }
  if (impostazioni_validazioni['abilitazione']['Visualizza catasto in mappa'] != "Visualizza catasto in mappa") {
    $('button').filter(function () {
      return /^Immobile[0-99]*_MappaCatastale$/.test(this.id);
    }).css('display', 'none');
  }
  if (impostazioni_validazioni['abilitazione']['Valida toponomastica'] != "Valida toponomastica") {
    $('button').filter(function () {
      return /^Immobile[0-99]*_ControlloStradario$/.test(this.id);
    }).css('display', 'none');
  }
  if (impostazioni_validazioni['abilitazione']['Valida catasto'] != "Valida catasto") {
    $('button').filter(function () {
      return /^Immobile[0-99]*_ControlloDatiCatastali$/.test(this.id);
    }).css('display', 'none');
  }

  //indico che l'esecuzione dello script è terminata e che quindi validator è
  //stato correttamente lanciato
  $('#GLOBO_MyJobIsDone').val('TRUE');
  hideLoader();

}


function update_codicefiscale() {
  var fields = $('input[name$="CodiceFiscale"]').get();

  if (fields.length > 0) {
    var i = fields.length - 1;
    do {
      var field = fields[i];
      //Attach on rule.change
      $(field).on('change blur', function () {
        //Estrae i dati solo se il campo è corretto.
        if ($(this).data('rule').correct) {
          var data = decodificaCF(this.value);
          if (data["errore"]) {
            alert(data["errore"]);
          } else {
            var prefix = this.getAttribute('name').split('_')[0];
            $('select#' + prefix + '_Sesso').val(data.sesso).trigger('change.self');
            $('input#' + prefix + '_DataNascita').val(data.giorno).trigger('change.self');

            //External
            $.ajax({
              url: WEB_SERVICE_ENTE + data.codice,
              dataType: 'html'
            }).done(function (html) {
              $('input#' + prefix + '_LuogoNascita').val($.parseJSON(html)[0]).trigger('change.self');
            });
          }
        }
        //else {
        //  alert('Il codice fiscale "' + $(this).val() + '" non è un codice fiscale valido 123.');
        //}
      });
    } while (i--);
  }
}
//estrae i valori utili dal codice fiscale
cf_month_table = {'A': '01', 'B': '02', 'C': '03', 'D': '04', 'E': '05', 'H': '06',
'L': '07', 'M': '08', 'P': '09', 'R': '10', 'S': '11', 'T': '12'};

function decodificaCF(cf) {
  if (cf.length == 16) {
    //Controllo carattere finale codice fiscale
    //href: http://it.wikipedia.org/wiki/Codice_fiscale#Generazione_del_codice_fiscale
    var cf = check_omocodia(cf.toUpperCase()),
    p = 15,
    d = 16,
    sum = 0,
    eve_tab = validator.cf_translate_table.even,
    odd_tab = validator.cf_translate_table.odd;
    //Somma dei valori dei caratteri pari a quelli dispari
    do {
      p -= 2;
      d -= 2;
      sum += (cf.charAt(p) ? eve_tab[cf.charAt(p)] : 0) + odd_tab[cf.charAt(d)];
    } while (p && d);
    //Confronta il valore dell'ultimo carattere
    result = (sum % 26) == (cf.charCodeAt(15) - 65);
    if (!result) {
      return {
        'errore': "Il codice fiscale '" + cf +
        "' non è corretto:\n" + "il codice di controllo non corrisponde.\n"};
      }

      var giorno, mese, anno,
      sesso, comune, current_year = new Date().getFullYear();



      mese = cf_month_table[cf.charAt(8)];
      anno = parseInt(cf.substring(6, 8));

      if (2000 + anno > current_year) {
      anno += 1900; //Nato nel 1900
    } else {
      anno += 2000; //Nato nel 2000
    }

    giorno = parseInt(cf.substring(9, 11));
    sesso = 'M';
    if (giorno > 40) {
      sesso = 'F';
      giorno = giorno - 40;
    }
    //aggiunge lo zero al giorno.
    if (giorno < 10) {
      giorno = '0' + giorno;
    }

    var comune = 'C_' + cf.substring(11, 15).toUpperCase();
    return {
      giorno: giorno + '/' + mese + '/' + anno,
      sesso: sesso,
      codice: comune
    };
  }

  return {};
}

//prototipo new funzione mappa toponomastica

function mappaToponomasticaNew(prefix) {
  if (impostazioni_validazioni['abilitazione']['Visualizza toponomastica in mappa'] == "Visualizza toponomastica in mappa") {
    //assegno i parametri standard all'url
    var param_url = {};
    //ottengo i dati certificati sulla strada da mostrare
    doAlerts = false;
    var dati_strada = controlloStradarioNew(prefix);
    doAlerts = true;
    //se è false significa che la validazione è fallita
    if (!dati_strada) {
      var param_url = {
        "map": impostazioni_validazioni['toponomastica']['mappa']
      };
      url_mappa = impostazioni_validazioni['url_gfmaplet'] + "?";
      $.each(param_url, function (nome_param, valore_param) {
        url_mappa += nome_param + "=" + valore_param + "&";
      });
      //rimuovo l'ultim & e apro la nuova scheda
      url_mappa = url_mappa.substring(0, url_mappa.length - 1);
      globoAlert("Impossibile visualizzare i dati in mappa: sarà visualizzata la cartografia con estensione massima");
      window.open(url_mappa);
    } else {
      //se la versione della GFMaplet è 6 posso fare cose fiche

      //aggiungo parametri per la versione 6
      param_url["map"] = impostazioni_validazioni['toponomastica']['mappa'];

      //di default il layer è quello dello stradario, diventerà acessi forse dopo
      var idlayer = impostazioni_validazioni['toponomastica']['idlayer'];
      var campoComune = "comune";
      //inizializziamo il filtro, come il comune
      var filtro = {};

      filtro[campoComune] = dati_strada["Comune"];

      //se il tipo toponimo è classe + desc
      if (tipoToponimo == 1) {
        filtro[campoClasse] = dati_strada["Via"].split(' ')[0];
        filtro[campoToponimo] = dati_strada["Via"].split(' ')[1];
      } else {
        //se il tipo toponimo prevede tutto insieme
        filtro[campoToponimo] = dati_strada["Via"];
      }
      //se c'è il civico
      if (dati_strada["Civico"] != "" && dati_strada["Civico"] != "SNC") {
        //se è di tipo 1
        if (tipoCivico == 1) {
          //faccio civico e barrato separati
          filtro[campoCivico] = dati_strada["Civico"];
          if (dati_strada["Barrato"] != null && dati_strada["Barrato"] != "") {
            filtro[campoSubalterno] = dati_strada["Barrato"];
          }
        } else {
          filtro[campoCivico] = dati_strada["Civico"];
          if (dati_strada["Barrato"] != null && dati_strada["Barrato"] != "") {
            filtro[campoCivico] += separatoreCivico + dati_strada["Barrato"];
          }
        }
        idlayer = impostazioni_validazioni['toponomastica']['idlayer'];
      }

      var sql_filter = "";
      $.each(filtro, function (nome_campo, valore) {
        if (valore != null && valore != '') {
          sql_filter += nome_campo + "='" + valore.toString().replace("'", "''").toUpperCase() + "' AND ";
        }
      });
      sql_filter = sql_filter.substring(0, sql_filter.length - 4);
      if (sql_filter != null && sql_filter != '') {
        param_url["highlightFeatures"] = encodeURI(impostazioni_validazioni['toponomastica']['service']) + "|" + encodeURI(idlayer) + "|" + encodeURI(sql_filter);
      }

      //compongo l'url con i vai param
      url_mappa = impostazioni_validazioni['url_gfmaplet'] + "?";
      $.each(param_url, function (nome_param, valore_param) {
        url_mappa += nome_param + "=" + valore_param + "&";
      });
      //tolgo l'ultima & e apro in un altra scheda la mappa
      url_mappa = url_mappa.substring(0, url_mappa.length - 1);
      window.open(url_mappa);

    }
  } else {
    globoAlert("Funzione non disponibile");
  }
}


//esegue la compilazione dei campi ricevuti tramite json, previo l'apponimento del corretto prefix

function campiDaJSon(indirizzo, prefisso, force) {
  showLoader("Recupero delle informazioni in corso...");
  // Recupera un JSON tramite AJAX e assegna ai campi i corrispondenti valori
  $.ajax({
    url: indirizzo,
    dataType: 'json',
    //async: asincrona,
    error: function () {
      alert('Non è stato possibile recuperare i dati');
    },
    success: function (data) {
      for (key in data) {
        var tokens = key.split('_');
        if (tokens[0] === 'Metadati' && prefisso != 'Metadati') {
          delete data[key];
        }
      }
      // Non compilare il campo DichiarazioneCF: deve essere preso dai parametri in URL
      if ('DichiarazioneCF' in data) {
        delete data['DichiarazioneCF']
      }
      processData(data, prefisso, force);
    }
  });
}

function campiFrameJSon(indirizzo) {


  /*if(!asincrona)
  asincrona=false;*/
  showLoader("Recupero delle informazioni in corso...");
  // Recupera un JSON tramite AJAX e assegna ai campi i corrispondenti valori
  $.ajax({
    url: indirizzo,
    dataType: 'json',
    //async: asincrona,
    error: function () {
      alert('Non è stato possibile recuperare i dati');
    },
    success: function (data) {
      processData(data);
    }
  });
}

function processData(data, prefisso, force) {
  var key,
      value,
      el;
  var check_again = new Array();
  for (key in data) {
    if (prefisso !== undefined) {
      document_key = prefisso + '_' + key;
    } else {
      document_key = key;
    }
    value = data[key];

    //Controlliamo nell'albero di validazione
    tipo = $('#' + document_key).attr('type');
    if (key == 'Ruolo' && prefisso != 'Titolare') {
      //@IMPORTANT: WORKAROUND x evitare di copiare il ruolo del titolare in altri posti
      tipo = 'file';
    }

    if (tipo != 'file' && document_key != 'GLOBO_MyJobIsDone' && document_key != 'GLOBO_IsReadyToSend' && value != null) {

      var node = validator.tree[document_key.replace(/-/g, '_')];

      if (node !== undefined) {
        node.default_value = value;
        node.old_value = value;
        node.set_value(value);
        //x i radio e i checkbox dovrò fare un secondo giro di ricompilazione
        if ((!node.allowed || !node.enabled) && ($(node.element).attr('type') == 'checkbox' || $(node.element).attr('type') == 'radio')) {
          check_again.push({'node': node, 'value': value});
        }

        // Issue: #188
        if (node.group !== undefined) {
          node.group.check();
        }
      } else {
        //Proviamo a recuperare l'id.
        el = document.getElementById(document_key);
        if (el !== null) {
          el.value = value;
          if (el.type == 'checkbox') {
            el.checked = true;
          }
        }
      }
    }
  }

  for (new_key in check_again) {
    elem = check_again[new_key];
    elem.node.default_value = elem.value;
    elem.node.old_value = elem.value;
    elem.node.set_value(elem.value);

    // Issue: #188
    if (node.group !== undefined) {
      node.group.check();
    }

  }


  if ($('meta[name=GLOBO_immagine]').length > 0) {
    loadImmagini();
  }

  validator.tree['Data'].set_value(today);
  validator.tree['Data'].check();
  validator.tree['Data_PDF'].set_value(today);
  validator.tree['Data_PDF'].check();
      //validator.errors = new Array();
  hideLoader();
}


//recupera i dati di compilazione

function recuperaDatiCompilazione(id) {
  // Svuota tutti i checkbox (quelli da selezionare saranno valorizzati poi)
  //$('input:checkbox').attr('checked',false);
  // Recupera i dati
  campiDaJSon('/sportello_telematico/recupera_dati/' + id, undefined, true);
  EventManager.publish('webservice.reload');
}
//recupera il cf
function transcodificaCf(cf, prefisso) {
  campiDaJSon('/sportello_telematico/recupera_dati_cf/' + cf, prefisso, true);
}

//recupera il cf
function transcodificaCfImpresa(cf, prefisso) {
  campiDaJSon('/sportello_telematico/recupera_dati_piva/' + cf, prefisso, true);
}

//recupera i dati di una determinata tabella in base al prefix
function recuperaDatiFrame(prefisso) {
  // Svuota tutti i checkbox (quelli da selezionare saranno valorizzati poi)
  var id = $('[name="GLOBO_id_padre"]').val();
  // Recupera i dati
  if (id) {
    campiFrameJSon('/sportello_telematico/carica_dati_frame/' + id + '/' + prefisso);
  }
}

//recupera i dati di una determinata tabella in base al prefix

function copiaDatiFrame(prefisso_origine, prefisso_destinazione, force) {
  // Svuota tutti i checkbox (quelli da selezionare saranno valorizzati poi)
  var id = $('[name="GLOBO_id_padre"]').val();
  // Recupera i dati
  if (id) {
    $.ajax({
      url: '/sportello_telematico/carica_dati_frame/' + id + '/' + prefisso_origine,
      dataType: 'json',
      //async: asincrona,
      error: function () {
        alert('Non è stato possibile recuperare i dati della precedente compilazione');
      },
      success: function (data) {
        // Per ogni coppia di valori caricati
        var key, value, el;
        for (key in data) {
          //ottengo la seconda parte del nome dal dato di origine
          var postfisso = key.split('_').slice(1).join('_');
          //ottengo il valore
          value = data[key];
          //compongo il campo destinatario
          document_key = (prefisso_destinazione + '_' + postfisso).replace(/-/g, '_');
          //Controlliamo nell'albero di validazione
          tipo = $('#' + document_key).attr('type');
          if (prefisso_origine == 'Titolare' && postfisso == 'Ruolo') {
            //@IMPORTANT: WORKAROUND x evitare di copiare il ruolo del titolare in altri posti
            tipo = 'file';
          }
          if (tipo != 'file') {
            if (validator.tree[document_key] !== undefined) {
              if (!force) {
                validator.tree[document_key].default_value = value;
                validator.tree[document_key].old_value = value;
                validator.tree[document_key].check();
              } else {
                validator.tree[document_key].set_value(value);
              }
            } else {
              //Proviamo a recuperare l'id.
              el = document.getElementById(document_key);
              if (el !== null) {
                el.value = value;
                if (el.type == 'checkbox') {
                  el.checked = true;
                }
              }
            }
          }
        }
      }
    });
}
}


//estrae il valore di un parametro url

function getParameter(name) {
  // Recupera un parametro passato sull'URL a partire dal suo nome
  return decodeURI(
    (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, ''])[1]);
}

//compila i campi con un determinato prefisso con i valori del profilo utente

function recuperaAnagrafica(prefisso) {
  campiDaJSon('/sportello_telematico/carica_dati_utente', prefisso, true);
  campiDaJSon('/sportello_telematico/carica_dati_utente', prefisso, false);
}

function recuperaImmobile(prefisso) {
  campiDaJSon('/sportello_telematico/carica_dati_immobile', prefisso, true);
  campiDaJSon('/sportello_telematico/carica_dati_immobile', prefisso, false);
}
/*
 //compila i campi con un determinato prefisso con i valori del profilo professionista

 function recuperaProfessionista(prefisso) {
 campiDaJSon('/sportello_telematico/carica_dati_professionista', prefisso, false);
 }

 function recuperaAzienda(prefisso) {
 campiDaJSon('/sportello_telematico/carica_dati_azienda', prefisso, false);
 }

 function recuperaPersonaEAzienda(prefisso) {
 campiDaJSon('/sportello_telematico/carica_dati_utente', prefisso, false);
 campiDaJSon('/sportello_telematico/carica_dati_azienda', prefisso, false);
 }
 */
 function mappaToponomastica(idx) {
  // Wrappo alla nuova versione
  return mappaToponomasticaNew(idx);
}

function mappaCatastale(idx) {
  // Wrappo alla nuova versione
  return mappaCatastaleNew(idx);

}


function mappaCatastaleNew(idx) {
  //se prevista la visualizzazione in mappa
  if (impostazioni_validazioni['abilitazione']['Visualizza catasto in mappa'] == "Visualizza catasto in mappa") {
    //ottengo i dati vaidati
    doAlerts = false;
    var dati_particella = controlloCatastoNew(idx);
    doAlerts = true;
    //se non ho dati significa che la validazione si è sfasciata
    if (dati_particella) {
      //in base alla versione predispongo diverse chiamate

      var param_url = {
        "map": impostazioni_validazioni['catasto']['mappa']
      };
      //costituisco il filtro con le informazioni validate
      var filtro = {
        "COMUNE": dati_particella['Comune'],
        "SEZIONE": (dati_particella['PtSezione'] != undefined ? dati_particella['PtSezione'] : dati_particella['Sezione']),
        "FOGLIO": (dati_particella['PtFoglio'] != undefined ? dati_particella['PtFoglio'] : dati_particella['Foglio']),
        "NUMERO": (dati_particella['PtNumero'] != undefined ? dati_particella['PtNumero'] : dati_particella['Numero']).toString().replace(/^[0]+/g, "")
      };
      //creo un filtro come da sql
      var sql_filter = "";
      $.each(filtro, function (nome_campo, valore) {
        if (valore != null && valore != '') {
          sql_filter += nome_campo + "='" + valore.toString().replace("'", "''") + "' AND ";
        }
      });
      sql_filter = sql_filter.substring(0, sql_filter.length - 4);
      //aggiungo il filtro sql ai parametri url
      param_url["highlightFeatures"] = encodeURI(impostazioni_validazioni['catasto']['service']) + "|" + encodeURI(impostazioni_validazioni['catasto']['idlayer']) + "|" + encodeURI(sql_filter);

      //compongo l'ulr con i vari parametri necessari
      url_mappa = impostazioni_validazioni['url_gfmaplet'] + "?";
      $.each(param_url, function (nome_param, valore_param) {
        url_mappa += nome_param + "=" + valore_param + "&";
      });
      //rimuovo l'ultim & e apro la nuova scheda
      url_mappa = url_mappa.substring(0, url_mappa.length - 1);
      window.open(url_mappa);

    } else {
      var param_url = {
        "map": impostazioni_validazioni['catasto']['mappa']
      };
      url_mappa = impostazioni_validazioni['url_gfmaplet'] + "?";
      $.each(param_url, function (nome_param, valore_param) {
        url_mappa += nome_param + "=" + valore_param + "&";
      });
      //rimuovo l'ultim & e apro la nuova scheda
      url_mappa = url_mappa.substring(0, url_mappa.length - 1);
      globoAlert("Impossibile visualizzare i dati in mappa: sarà visualizzata la cartografia con estensione massima");
      window.open(url_mappa);
    }
  } else {
    globoAlert("Funzione non disponibile.");
  }
}

//nuova funzione per la certificazione dell'indirizzo

function controlloStradarioNew(prefix, allow_choice) {
  if (typeof(allow_choice)==='undefined') {
    allow_choice = true;
  }
  if (impostazioni_validazioni['abilitazione']['Valida toponomastica'] == "Valida toponomastica") {

    showLoader("Validazione dati toponomastici in corso...");

    var dati = {
      "Validazione": 'toponomastici',
      "comune": $("[name=" + prefix + "CatComune]").val(),
      "toponimo": $("[name=" + prefix + "Via]").val(),
      "numero": $("[name=" + prefix + "Civico]").val(),
      "lettera": $("[name=" + prefix + "Barrato]").val()
    };

    if ($("[name=" + prefix + "Via]").val() == "") {
      globoAlert("Inserisci almeno la via dell'immobile");
      return true;
    }
    var jsdati = $.toJSON(dati);

    $.ajax({
      async: false,
      type: 'POST',
      url: '/validazione_dati/valida_dati',
      data: {"dati": jsdati},
      success: function (risposta) {
        try {
          jsdati = $.parseJSON(risposta);
        } catch (err) {
          jsdati = new Array();
          jsdati['Esito'] = 'KO';
          jsdati['Message'] = 'Si è verificato un errore durante la validazione dei dati toponomastici.';
        }
      },
      error: function (risposta) {
        jsdati = new Array();
        jsdati['Esito'] = 'KO';
        jsdati['Message'] = 'Si è verificato un errore durante la validazione dei dati toponomastici.';
      }
    });


    if (jsdati['Esito'] == 'KO') {
      //retrocompatibilità mantenuta per ora
      globoAlert(jsdati['Message']);
      hideLoader();
      return false;
    } else {
      // Se il risultato è uno solo ricevo 'OK' come valore.
      if (jsdati['Esito'] == 'OK') {
        // E quindi compilo i campi con i valori restituiti, retrocompatibile.
        $("[name=" + prefix + "Via]").val(jsdati['Via']);
        if (dati['numero'])
        {
          $("[name=" + prefix + "Civico]").val(jsdati['Civico']);
          $("[name=" + prefix + "Barrato]").val(jsdati['Barrato']);
        }
        globoAlert("I dati inseriti sono corretti.");
        hideLoader();
        return jsdati;
      } else {
        // SE l'esito è il multirisultato provvedo a gestirlo.
        if (jsdati['Esito'] == 'MULTI') {
          // Inizializzo le variabili.
          var selectionContent = '';
          var trovato = false;
          // Compongo l'attuale valore della via per una comparazione successiva.
          var actualValue = $("[name=" + prefix + "Via]").val() + ', ' + $("[name=" + prefix + "Civico]").val()
          if ($("[name=" + prefix + "Barrato]").val() != undefined && $("[name=" + prefix + "Barrato]").val() != '') {
             actualValue += '/' + $("[name=" + prefix + "Barrato]").val();
          }
          // Ciclo sui risultati presenti
          for (var index in jsdati['Results']) {
            // Compongo il possibile valore della mia via per compararlo con l'attuale.
            var completeValue = jsdati['Results'][index]['Via'] + ', ' + jsdati['Results'][index]['Civico'];
            if (jsdati['Results'][index]['Barrato'] != undefined && jsdati['Results'][index]['Barrato'] != '') {
              completeValue += '/' + jsdati['Results'][index]['Barrato'];
            }
            // Se il valore rappresenta già esattamente uno di quelli presenti...
            if (completeValue.toUpperCase() == actualValue.toUpperCase()) {
              // ...segno l'indice ed esco dal ciclo
              trovato = index;
              break;
            }
            // Compongo la porzione di scelta del nuovo valore.
            selectionContent += "<p class='row-selezione-toponomastica' onClick=\"selectedToponimo('" + prefix + "', '" + jsdati['Results'][index]['Via'].replace("'", "\\'") + "', '" + jsdati['Results'][index]['Civico'] + "');\">" + completeValue + "</p>";
          }
          // Se non ho corrispondenza esatta mostro il div di scelta
          if (!trovato) {
            if (allow_choice) {
              var localTitle = '<div class="title-selezione-toponomastica">La validazione ha restituito più di un risultato, scegli quello corretto tra quelli sottostanti</div>';
              $('#error-text').empty().append(localTitle + selectionContent);
              $('#background').css({
                'display': 'none'
              });
              $('#sendAnyway').css({
                'display': 'none'
              });
              $('#close').css({
                'display': 'none'
              });
              $('#errors').css({
                'left': '21cm',
                'right': '1cm',
                'width': 'auto',
                'heigth': 'auto',
                'display': 'block'
              });
            } else {
              return false;
            }
          } else {
            // SE ho trovato la corrispondenza esatta lascio il valore e continuo
            globoAlert("I dati inseriti sono corretti.");
            hideLoader();
            return jsdati['Results'][trovato];
          }
        }
      }
    }
  } else {
    globoAlert("Funzione non disponibile.");
    return true;
  }
}

//nuova funzione per la certificazione dei dati catastali

function controlloCatastoNew(prefix)
{
  //se la validazione è abilitata
  if (impostazioni_validazioni['abilitazione']['Valida catasto'] == "Valida catasto")
  {

    showLoader("Validazione dati catastali in corso...");
    //controllo che abbia scelto un tipo altrimenti dopo crasha
    if ($("[name=" + prefix + "Tipo]").val() == "") {
      globoAlert("Inserisci il tipo di immobile");

      hideLoader();
      return false;
    }
    //controllo che abbia scelto un tipo altrimenti dopo crasha
    if ($("[name=" + prefix + "CatComune]").val() == "") {
      globoAlert("I dati inseriti sono incompleti. Inserisci almeno il codice catastale, il foglio e il numero");
      return false;
      hideLoader();
    }
    //controllo che abbia scelto un tipo altrimenti dopo crasha
    if ($("[name=" + prefix + "CatFoglio]").val() == "") {
      globoAlert("I dati inseriti sono incompleti. Inserisci almeno il codice catastale, il foglio e il numero");
      hideLoader();
      return false;
    }
    //controllo che abbia scelto un tipo altrimenti dopo crasha
    if ($("[name=" + prefix + "CatNumero]").val() == "") {
      globoAlert("I dati inseriti sono incompleti. Inserisci almeno il codice catastale, il foglio e il numero");
      hideLoader();
      return false;
    }
    //preparo il pacchetto di dati da validare
    var dati = {
      "Validazione": 'catastali',
      "Tipo": $("[name=" + prefix + "Tipo]").val(),
      "Comune": $("[name=" + prefix + "CatComune]").val(),
      "Sezione": $("[name=" + prefix + "CatSezione]").val(),
      "Foglio": $("[name=" + prefix + "CatFoglio]").val(),
      "Numero": $("[name=" + prefix + "CatNumero]").val(),
      "Subalterno": $("[name=" + prefix + "CatSubalterno]").val()
    };

    //preparo la chiamata e alla risposta la parso JSON
    var jsdati = $.toJSON(dati);
    $.ajax({
      async: false,
      type: 'POST',
      url: '/validazione_dati/valida_dati',
      data: {"dati": jsdati},
      success: function (risposta) {
        //alert(risposta);
        try {
          jsdati = $.parseJSON(risposta);
        } catch (err) {
          jsdati = new Array();
          jsdati['Esito'] = 'KO';
          jsdati['Message'] = 'Si è verificato un errore durante la validazione dei dati';
        }
      },
      error: function (risposta) {
        jsdati = new Array();
        jsdati['Esito'] = 'KO';
        jsdati['Message'] = 'Si è verificato un errore durante la validazione dei dati';
        //return false;
      }
    });

    //se dice KO significa che non funziona
    if (jsdati['Esito'] == 'KO') {
      globoAlert(jsdati['Message'] + '. Verifica i valori inseriti ricordando che per alcuni Comuni è necessario inserire anche la sezione.');
      //retrocompatibilità per ora più avanti faremo qualcosa d'altro.
      hideLoader();
      return false;
    } else {

      $("[name=" + prefix + "CatComune]").val(jsdati[0]["Comune"]);
      $("[name=" + prefix + "CatSezione]").val(jsdati[0]["Sezione"]);
      $("[name=" + prefix + "CatFoglio]").val(jsdati[0]["Foglio"]);
      $("[name=" + prefix + "CatNumero]").val(jsdati[0]["Numero"]);
      $("[name=" + prefix + "CatSubalterno]").val(jsdati[0]["Subalterno"]);
      globoAlert("I dati inseriti sono corretti.");
      hideLoader();
      return jsdati[0];
    }
  } else {
    globoAlert("Funzione non disponibile.");
    return true;
  }
}

//vecchia funzione per la certificazione degli indirizzi stradali

function ControlloStradario(idx) {
  return controlloStradarioNew(idx);
}

//vecchia funzione per la certificazione dei dati catastali

function ControlloDatiCatastali(idx) {
  controlloCatastoNew(idx);
}

//controlla se le regole sintattiche sono rispettate o meno

function sendForm(ignore_errors) {
  if (ignore_errors) {
    bypass_check = true;
  }

  if (upload_caller != '') {
    codice_modulo = $('input[name=GLOBO_codice_modulo]').val();
    form.enctype = "multipart/form-data";
    form.encoding = "multipart/form-data";
    form.target = upload_caller + '_upload_target';
    form.action = '/sportello_telematico/upload_image/' + codice_modulo + '/' + upload_caller;
    return true;
  }

  //Callback beforeCheck
  if (typeof beforeCheck === 'function') {
    beforeCheck();
  }

  for (elemento in validator.tree) {
    validator.tree[elemento].check();
  }

  var errors = validator.errors,
      id;
  if (validator.errors.length > 0){
    for(id in errors) {
      if(errors[id].node !== null && undefined != errors[id].node) {
        if(errors[id].node.error == null) {
          validator.errors[id].remove();
        }
      }
    }
  }

  if (validator.errors.length === 0 || bypass_check) {
    //se ci sono errori ma mi è stato detto di ignorarli metto a
    if (validator.errors.length > 0) {
      $('#GLOBO_IsReadyToSend').val('FALSE');
    } else {
      $('#GLOBO_IsReadyToSend').val('TRUE');
    }

    if (typeof beforeSave != 'undefined') {
      beforeSave();
    }
    //ids = 'Immobile_|Immobile1_|Immobile2_|Immobile3_|Immobile4_|Immobile5_|Immobile6_|Immobile7_|Immobile8_|Immobile9_';
    controlli_immobili = {
      "Immobile_": "L'immobile oggetto dell'istanza",
      "Immobile1_": "L'ulteriore immobile oggetto dell'istanza",
      "Immobile2_": "L'ulteriore secondo immobile oggetto dell'istanza",
      "Immobile3_": "L'ulteriore terzo immobile oggetto dell'istanza",
      "Immobile4_": "L'ulteriore quarto immobile oggetto dell'istanza",
      "Immobile5_": "L'ulteriore quinto immobile oggetto dell'istanza",
      "Immobile6_": "L'ulteriore sesto immobile oggetto dell'istanza",
      "Immobile7_": "L'ulteriore settimo immobile oggetto dell'istanza"
    };

    var esito_controlli_vari = true;

    if (!bypass_check) {
      $.each(controlli_immobili, function (prefisso, messaggio_imm) {
        doAlerts = false;
        //se il campo c'è ed è compilato significa che l'utente è stato in qualche modo
        //portato a compilarlo, quindi se la validazione è obbligatoria procedo
        if (validator.tree[prefisso + 'CatFoglio'] != undefined && validator.tree[prefisso + 'CatFoglio'].value() != "" && validator.tree[prefisso + 'CatFoglio'].element.type != 'hidden') {
          if (impostazioni_validazioni['abilitazione']['Richiedi catasto'] == 'Richiedi catasto') {
            if (!controlloCatastoNew(prefisso)) {
              alert(messaggio_imm + ": dati catastali non validi");
              esito_controlli_vari = false;
              //messo qua serve come break per $each
              return false;
            }
          }
        }
        if (validator.tree[prefisso + 'Via'] != undefined && validator.tree[prefisso + 'Via'].value() != "" && validator.tree[prefisso + 'Via'].element.type != 'hidden') {
          if (impostazioni_validazioni['abilitazione']['Richiedi toponomastica'] == 'Richiedi toponomastica') {
            if (!controlloStradarioNew(prefisso, false)) {
              alert(messaggio_imm + ": dati toponomastici non validi");
              esito_controlli_vari = false;
              return false;
            }
          }
        }
      });
      //se sono falliti gli immobili non procedo nemmeno a controllare le altre
      if (esito_controlli_vari) {
        if (controlloPec() == "KO") {
          esito_controlli_vari = false;
        }

        if (controlloMaggiorenni() == false) {
          esito_controlli_vari = false;
        }
      }
    }

    doAlerts = true;

    if (controlloAtecoNew() == "NotValid") {
      esito_controlli_vari = false;
    }



    if (!esito_controlli_vari) {
      return false;
    }

    $('input').filter(function () {
      return $(this).val() == 'gg/mm/aaaa';
    }).val('');

    $('input[disabled]').removeAttr("disabled").attr("readonly", "readonly");

    hide_error();
    hideLoader();
    if (ignore_errors == undefined) {
      alert("Attenzione! L'elaborazione del modulo potrebbe richiedere alcuni secondi. Vi preghiamo di non chiudere o modificare il modulo.");
    } else {
      alert("Attenzione: Non hai ancora terminato di riempire i campi del modulo. I moduli incompleti non possono essere inviati.");
    }


    form.enctype = "application/x-www-form-urlencoded";
    form.action = '/sportello_telematico/salva_modulo';
    form.target = '_self';
    return true;
  } else {
    $('#GLOBO_IsReadyToSend').val('FALSE');

    show_error();
  }
  return false;
}

//nuova funzione per ilcontrollo dell'esistenza del codice ateco

function controlloAtecoNew() {

  showLoader("Validazione codici ATECO in corso...");

  var elenco_coppie = $('#ATECO_Validation').val();
  //alert(elenco_coppie);
  if (elenco_coppie == undefined) {
    hideLoader();
    return "Valid";
  }
  var esito = true;
  $.each(elenco_coppie.split('|'), function (chiave_inutile, coppia_campi) {

    var campo_ateco = coppia_campi.split(',')[0];
    var campo_anno = coppia_campi.split(',')[1];
    var campo_desc = campo_ateco + '_note';

    campo_ateco = $('#' + campo_ateco).val();
    campo_anno = $('#' + campo_anno).val();
    if (campo_ateco != "" && campo_anno != "") {

      var jsdati = $.toJSON({
        "Validazione": 'ateco',
        "Ateco": campo_ateco,
        "Anno": campo_anno
      });

      $.ajax({
        async: false,
        type: 'POST',
        url: '/validazione_dati/valida_dati',
        data: {"dati": jsdati},
        success: function (risposta) {
          jsdati = risposta;
        }
      });
      //Parametri_Attivita_unica_o_prevalente (scia a - b)
      //x gli altri moduli sarà nella definizione del campo
      if (jsdati == 'NotValid') {
        hideLoader();
        globoAlert("Il codice ATECO '" + campo_ateco + "' risulta errato!");
        esito = false;

      }
    }
  });
hideLoader();
if (!esito) {
  return "NotValid";
}

}

function controlloPec() {

  showLoader("Controllo validità PEC in corso...");
  retvalue = 'OK';
  $.each($('input[format="pec"]'), function (offset, elemento) {
    mail = $(elemento).val();
    label = $(elemento).attr('label');
    if (mail) {
      $.ajax({
        async: false,
        type: 'POST',
        url: '/sportello_telematico/valida_pec/' + mail,
        data: '',
        success: function (risposta) {
          if (risposta['Esito'] == 'KO') {
            alert(label + ': l\'indirizzo che hai inserito non sembra essere un indirizzo PEC valido. Verificalo con attenzione: nel caso fossi sicuro della sua validità contatta immediatamente l\'assistenza che provvederà a inserirlo tra quelli riconosciuti.');
            retvalue = 'KO';
          }
        }
      });
    }
  });
  hideLoader();
  return retvalue;


}

function controlloMaggiorenni() {
  retvalue = true;
  $.each($('input[format="date_born"]'), function (offset, elemento) {
    date = $(elemento).val();
    label = $(elemento).attr('label');
    if (date) {
      parts = date.split('/');
      american_date = parts[2] + '-' + parts[1] + '-' + parts[0];
      date_born = new Date(american_date);
      date_now = new Date();
      diff = date_now.getFullYear() - date_born.getFullYear();
      if (diff == 18) {
        if (date_now.getMonth() < date_born.getMonth() || date_now.getDate() < date_born.getDate()) {
          retvalue = false;
          alert(label + ': è necessario che i soggetti coinvolti dalla pratica siano tutti maggiorenni');
        }
      } else {
        if (diff < 18) {
          retvalue = false;
          alert(label + ': è necessario che i soggetti coinvolti dalla pratica siano tutti maggiorenni');
        }
      }
    }
  });
  return retvalue;


}

//carica i valori campo presenti nei coookies e li attribuisce agli input

function caricaCampi() {
  //alert('not implemented, yet!');
  return;
}

//crea un cookie
function createCookie(name, value, days) {
  var date = new Date(),
  expires = '';

  if (days) {
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toGMTString();
  }

  document.cookie = name + "=" + value + expires + "; path=/";
}

//legge il contenuto di un cookie in base al suo nome
//Ritorna un oggetto contenente in coockie
function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');

  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ')
      c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0)
      return c.substring(nameEQ.length, c.length);
  }
  return null;
}


//mostra condizionalmente un messaggio se la visualizzazione è abilitata

function globoAlert(messaggio) {
  if (doAlerts) {
    alert(messaggio);
  }
}


//Controlla che un litera sia vuoto.

function isEmpty(o) {
  for (var i in o) {
    if (o.hasOwnProperty(i)) {
      return false;
    }
  }
  return true;
}

function show_error() {

  var text = '',
  i = validator.errors.length - 1;

  try {
    do {
      text = text + validator.errors[i].stringfy() + '\n';
    } while (i--);
  } catch (Exception) {

  }


  $('#fatals').remove();
  $('#sendAnyway').remove();
  var missing_fatals = checkFatal();


  $('#error-text').empty().append(text);
  if ($('#hide-errors').length == 0) {
    $('#errors').append('<div id=\'hide-errors\' onclick=\'hide_error();\' style=\'position:absolute;cursor:pointer;top:0px;right:10px;\'>X</div>');
  }

  try {
    $('#close').prop('type', 'button').innerHTML('Continua con la compilazione');
    if ($('#GLOBO_IsReadyToSend').length == 1 && $('#sendAnyway').length != 1 && missing_fatals == 0) {
      $('#errors').append('<button type="submit" id="sendAnyway" class="btn-send" onclick="sendForm(true);$(\'form\').submit();return false;">Salva parziale</button>');
    } else {
      $('#errors').append(messageFatal());
    }
  } catch (e) {
    $('.error-box-view').find('button.btn-error').replaceWith('<button type="button" id="close" class="btn-error" onclick="close_error()">Continua con la compilazione</button>');
    if ($('#GLOBO_IsReadyToSend').length == 1 && $('#sendAnyway').length != 1 && missing_fatals == 0) {
      $('#errors').append('<button type="submit" id="sendAnyway" class="btn-send" onclick="sendForm(true);$(\'form\').submit();return false;">Salva parziale</button>');
    } else {
      $('#errors').append(messageFatal());
    }
  }
  $('.error-box-view#errors').css({
    'left': '25%',
    'right': '25%',
    'width': '50%',
    'heigth': '80%'
  });
  $('.error-box-view').css({
    'display': 'block'
  });

  $('#close').css({
    'display': 'block'
  });



  //alert( 'Errori:\n' + text );
}

function close_error() {
  //$('#close').on('click', hide_error);
  $('#background').css({
    'display': 'none'
  });
  $('#sendAnyway').css({
    'display': 'none'
  });
  $('#close').css({
    'display': 'none'
  });
  $('#errors').css({
    'left': '21cm',
    'right': '1cm',
    'width': 'auto',
    'heigth': 'auto',
    'display': 'block'
  });

}

function hide_error() {

  $('#errors').css({
    'display': 'none'
  });
  $('#background').css({
    'display': 'none'
  });

}

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.slice(0, str.length) == str;
  };
}
//Metodo che consente l'override dei meta in modo inteligente.
var MetaOverride = {
  selector: function (element) {
    var id = element.getAttribute('id');
    return id.startsWith('GLOBO_modulo_c') || id.startsWith('GLOBO_modulofiglio_c') || id.startsWith('GLOBO_allegato_c');
  },
  get_identifier: function (element) {
    return element.getAttribute('id');
  },
  //Override di Node
  node_class: function (element, default_values) {
    validator.Node.call(this, element, default_values);

    this.override_fields = ['firmare', 'obbligatorio', 'numero', 'verifica_pagamento', 'firmato', 'email_a', 'istruzioni_invio', 'istruzioni_compilazione', 'campi_firma', 'metodo_invio', 'destinatario_amministrazione', 'destinatario_ufficio', 'segnatura', 'campi_firma_label', 'firmatari', 'firmatari_label', 'filename'];
    this.override_rules = {};

    this.correct = true;
    //override
    this.checked = function () {
    },
    this.check_value = function (values) {
    },
    this.dynamic_check_setter = function () {
    },
    this.dynamic_value_setter = function () {
    },
    this.enabled_check = function () {
    },
    this.mandatory_check = function () {
    },
    this.format_check = function () {
    },
            //Controlla il nodo corrente che tutte le regole siano valide.
            this.check = function (node_stack) {
              var override,
              value = '',
              rule;

              for (override in this.override_rules) {
                rule = this.override_rules[override];
                if (rule.result() !== '') {
                  value += override + '=\'' + rule.result() + '\' ';
                }
              }

              this.element.value = value;
              //Scateniamo l'evento rule change
              this.refresh_listener_rule(node_stack);
            };

    //Override
    this.load_event = function () {
      var i = this.override_fields.length - 1,
      override = null,
      rule = null;

      do {
        override = this.override_fields[i];
        rule = this.element.getAttribute(override);
        if (rule != null) {
          rule = validator.rule_factory(rule, this);
          this.override_rules[override] = rule;
          rule.register(this);
          //rule.evalutate();
        }
      } while (i--);
    };
  }
};


validator.register(MetaOverride);

function load_frames_data(prefix) {
  // Svuota tutti i checkbox (quelli da selezionare saranno valorizzati poi)
  var id = $('[name="GLOBO_id_padre"]').val();
  // Recupera i dati
  if (id) {
    $.ajax({
      url: '/sportello_telematico/carica_dati_frame/' + id + '/' + prefix,
      dataType: 'json',
      error: function () {
        alert('Non è stato possibile recuperare i dati della precedente compilazione');
      },
      success: function (data) {
        // Per ogni coppia di valori caricati
        var key, value, el;
        for (key in data) {
          if (prefisso !== undefined) {
            document_key = prefisso + '_' + key;
          } else {
            document_key = key;
          }
          value = data[key];

          //Controlliamo nell'albero di validazione
          if (validator.tree[document_key] !== undefined) {
            validator.tree[document_key].set_value(value);
          } else {
            //Proviamo a recuperare l'id.
            el = document.getElementById(document_key);
            if (el !== null) {
              el.value = value;
            }
          }
        }
      }
    });
  }
}

function caricaImpostazioniValidazioni() {
  return $.parseJSON($.ajax({
    async: false,
    cache: false,
    error: function (jqXHR, textStatus, errorThrown) {
      jqXHR.responseText = "{ }"; //Override
    },
    url: '/validazione_dati/get_impostazioni_validazioni',
    dataType: 'json'
  }).responseText);

}


function ControlloATECO(campo_anno, campo_ateco, campo_desc) {

  showLoader('Validazione codice ATECO in corso...');

  nome_campo_ateco = campo_ateco;
  var campo_ateco = $('#' + campo_ateco).val();
  var campo_anno = $('#' + campo_anno).val();

  if (campo_ateco != "" && campo_anno != "") {

    var jsdati = $.toJSON({
      "Validazione": 'ateco',
      "Ateco": campo_ateco,
      "Anno": campo_anno
    });

    $.ajax({
      async: false,
      type: 'POST',
      url: '/validazione_dati/valida_dati',
      data: {"dati": jsdati},
      success: function (risposta) {
        jsdati = risposta;
      }
    });
    //Parametri_Attivita_unica_o_prevalente (scia a - b)
    //x gli altri moduli sarà nella definizione del campo
    if (jsdati != 'NotValid') {

      globoAlert("Il codice ATECO '" + campo_ateco + "' risulta corretto!");
      if (campo_desc) {
        validator.tree[campo_desc.replace(/-/g, '_')].default_value = jsdati;
        validator.tree[campo_desc.replace(/-/g, '_')].old_value = jsdati;
        validator.tree[campo_desc.replace(/-/g, '_')].check();
      } else {
        elenco_campi_desc = new Array();
        elenco_campi_desc['Parametri_Codice_ATECO_attivita_prevalen'] = 'Parametri_Attivita_unica_o_prevalente';
//                elenco_campi_desc['Parametri_Attivita_1'] = 'Parametri_Attivita_1_note';
//                elenco_campi_desc['Parametri_Attivita_2'] = 'Parametri_Attivita_2_note';
//                elenco_campi_desc['Parametri_Attivita_3'] = 'Parametri_Attivita_3_note';
if (elenco_campi_desc[nome_campo_ateco] != undefined && campo_anno == '2007') {
          //$('#'+elenco_campi_desc[nome_campo_ateco]).val(jsdati);
          validator.tree[elenco_campi_desc[nome_campo_ateco].replace(/-/g, '_')].default_value = jsdati;
          validator.tree[elenco_campi_desc[nome_campo_ateco].replace(/-/g, '_')].old_value = jsdati;
          validator.tree[elenco_campi_desc[nome_campo_ateco].replace(/-/g, '_')].check();
        }
      }

      hideLoader();
      return "Valid";
    } else {

      globoAlert("Il codice ATECO '" + campo_ateco + "' risulta errato!");
      hideLoader();
      return "NotValid";

    }
  } else {
    hideLoader();
    alert("Indica l'anno del codice ateco '" + campo_ateco + "'");
  }
}



function copiaDatiDa(prefisso_dest, campo_origine, elenco_campi) {
  quellochevoglio = $('#' + campo_origine).val();
  if (quellochevoglio != undefined && quellochevoglio != "") {
    $.each(elenco_campi, function (indice_suffisso) {
      suffisso_campo = elenco_campi[indice_suffisso];
      var valore_origine = $('#' + quellochevoglio + suffisso_campo).val();
      var destinazione = (prefisso_dest + suffisso_campo).replace(/-/g, '_');
      if ($('#' + quellochevoglio + suffisso_campo).length > 0 && validator.tree[destinazione] != undefined) {
        validator.tree[destinazione].default_value = valore_origine;
        validator.tree[destinazione].old_value = valore_origine;
        validator.tree[destinazione].element.value = valore_origine;
        validator.tree[destinazione].check();
      }
      validator.tree[prefisso_dest + "_Copia"].element.value = "copia i dati da";
    });
  }
}

//Compilazione parziale rende obbligatorio almeno per la compilazione parziale
function checkFatal() {
  return $('[fatal]').filter(function () {
    //normalmente torno TRUE se il valore è scritto, quindi non è stringa vuota o indeifnito
    if ($(this).prop('type') == 'text' || $(this).prop('type') == 'select' || ($(this).prop('type') == undefined && $(this).prop("tagName").toUpperCase() == 'INPUT')) {
      return $(this).val() == undefined || $(this).val() == '';
    }

    //per i checkbox o radio seleziono tutti quelli appartenenti allo stesso group e dico TRUE se nessuno è checked
    if ($(this).prop('type') == 'checkbox' || $(this).prop('tagName').toUpperCase() == 'DIV') {
      return ($('input[group="' + $(this).prop('id') + '"]:checked').size() + $('input[name="' + $(this).prop('id') + '"]:checked').size()) == 0;
    }
  }).size(); //ritorno il numero di elementi che non risultano compilati pur indicati come fatal
}


function messageFatal() {

  var out = '<div id="fatals">Devi compilare obbligatoriamente ancora ';
  $('[fatal]').filter(function () {
    if ($(this).prop('type') == 'text' || $(this).prop('type') == 'select' || ($(this).prop('type') == undefined && $(this).prop("tagName").toUpperCase() == 'INPUT')) {
      return $(this).val() == undefined || $(this).val() == '';
    }

    if ($(this).prop('type') == 'checkbox' || $(this).prop('tagName').toUpperCase() == 'DIV') {
      return ($('input[group="' + $(this).prop('id') + '"]:checked').size() + $('input[name="' + $(this).prop('id') + '"]:checked').size()) == 0;
    }
  }).each(function (index, value) {

    //alert(index + ' ' + $(value).attr('label'));
    out = out + '<a onclick="close_error()" class="error-link" href="#' + $(value).attr('id') + '">' + $(value).attr('label') + "</a>, ";

  });

  return out.substring(0, out.length - 2) + ' per salvare una bozza della compilazione</div>';


}

/*Restituisce una data in format gg/mm/aaaa*/
function get_date(date) {
  //ripristino i campi data alla data odierna
  var month = date.getMonth() + 1,
  day = date.getDate(),
  year = date.getFullYear();
  //Aggiustiamo con il giusto numero di 0
  month = month < 10 ? '0' + month : month;
  day = day < 10 ? '0' + day : day;

  return day + "/" + month + "/" + year;
}

/*Restituisce la data di oggi*/
function get_today_date() {
  //ripristino i campi data alla data odierna
  return get_date(new Date());
}

/**
 * Mostra l'icona di caricamento con messaggio
 *
 * La funzione compone dinamicamente una finestra da mostrare all'interno della
 * modulistica durante i tempi morti di caricamento
 *
 * @param {type} message
 * @returns {undefined}
 */
function showLoader(message) {
  hideLoader();
  div_loader = $('<div class="img-loader" /></div>').append(img_loader);
  div_loader.append('<div style="width: 355px; float: right; padding-top: 8px;">' + message + '</div>');
  $('body').append(div_loader);
}

function hideLoader() {
  $('.img-loader').remove();

}

function selectedToponimo(prefix, via, civico, barrato) {
  hideLoader();
  hide_error();
  $("[name=" + prefix + "Via]").val(via);
  if (civico)
  {
    $("[name=" + prefix + "Civico]").val(civico);
    $("[name=" + prefix + "Barrato]").val(barrato);
  }
}

// =================================================================
// ======================== Integrazione WS ========================
// =================================================================
$(document).ready(function () {
  $('[ws-name]').each(function (i, e) {
    var wsName = $(e).attr('ws-name');
    var wsIn = $(e).attr('ws-param-in');
    var wsOut = $(e).attr('ws-param-out');
    var wsOn = $(e).attr('ws-on');

    var data = wsOn.split(':');
    var eventElement;
    var eventTrigger;

    if (data.length === 2) {
      eventElement = data[0];
      eventTrigger = data[1];
    } else if (data.length === 1) {
      eventElement = data[0];
      eventTrigger = 'click';
    }

    var parametersOut = {};
    if (typeof wsOut !== "undefined") {
      $(wsOut.split(';')).each(function (j, e) {
        var p = e.split('=');

        parametersOut[p[1]] = p[0];
      });
    }

    var handler = function (ev) {
      var parametersIn = {},
          allCorrect = true;
      if (typeof wsIn !== "undefined") {
        $(wsIn.split(';')).each(function (i, elem) {
          var p = elem.split('='),
              name = $('#' + p[1]).attr('name');

          if (name in validator.tree) {
            allCorrect = allCorrect && validator.tree[name].filled;
          }

          parametersIn[p[0]] = $.trim($('#' + p[1]).val());
        });
      }

      if (allCorrect) {
        $.ajax({
          method: 'POST',
          contentType: 'application/json',
          url: '/validator_webservices/web_services',
          data: JSON.stringify({
            name: wsName,
            parameters: parametersIn
          }),
          success: function (data) {
            var value, element_name, node;
            for (var k in data.results) {
              value = data.results[k];
              // If wsOut is specified use mapping.
              if (k in parametersOut) {
                element_name = parametersOut[k];
              }
              // Else use name itself.
              else {
                element_name = k;
              }

              // If there is '*' in name the is a pattern.
              if (element_name.indexOf('*') > -1 && typeof value === "object") {
                var i = 0;
                for (var v in value) {
                  i++;
                  node = validator.tree[element_name.replace('*', i)];
                  if (typeof node !== "undefined" ) {
                    node.set_value(v);
                  }
                }
              }
              // Else follow common pattern.
              else {
                node = validator.tree[element_name];
                if (typeof node !== "undefined") {
                  // Use validator .set_value.
                  if (typeof value === "object") {
                    node.set_options(value);
                  } else {
                    node.set_value(value);
                  }
                }
              }
            }
          }
        })
        .fail(function (resp) {
          // Avviso del problema
        });
      }
    };

    // register event
    EventManager.subscribe('webservice.reload', handler);
    $(eventElement).on(eventTrigger, handler);
  });
});
