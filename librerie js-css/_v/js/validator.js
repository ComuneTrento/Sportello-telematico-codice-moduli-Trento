/*
 Author: Mattia Rossi
 Project: Validator
 Version: 1.2b
 Date: 29-01-2013
 Validator, libreria javascript che introduce funzionalità di validazione dei
 form HTML.
 */
"use strict";
(function (window, undefined) {
  var
          rules = {}, //Caching di tutte le regole.
          //Ogetto globale
          validator = {
            //Versione del prodotto
            version: '1.2b',
            tree: {}, //lista di elementi
            errors: new Array(), //Lista errori.
            registered: new Array(), //Lista di nodi registrati
            //crea l'albero delle regole
            register: function (data) {
              /*Registra un oggetto, guardare la documentazione per vedere i metodi obbligatori.*/
              data.node_class.prototype = new Node;
              data.node_class.prototype.constructor = data.worker;
              this.registered.push(data);
            },
            tree_builder: function () {
              this.parse(); //crea prima la lista

              var rule, element, node, id, group, group_list = new Array();
              /*Boost Cycle!*/
              for (node in this.tree_cache) {
                node = this.tree_cache[node];
                group = node[0].getAttribute('group');
                if (group) {
                  group_list[group] = group;
                }
                this.build_node(node[0], node[1]);
              }


              /*Caricamento posteriore al build dell'albero.*/
              var post_build = new Array();
              for (node in this.tree) {
                //Attacchiamo al DOM la 'regola'
                node = this.tree[node];
                if (node instanceof RadioNode) {
                  post_build.push(node);
                  continue;
                }

                $.data(node.element, 'rule', node);
                node.load_event();
              }

              //Post build ( registriamo gli eventi del gruppo alla fine )
              var len = post_build.length;
              var i = 0;
              if (len >= 0) {
                do {
                  node = post_build[i];
                  if (typeof node !== 'undefined') {
                    //Il RadioNode non è un elemento DOM
                    //$.data(node.element, 'rule', node)
                    node.load_event();
                  }
                  i++;
                } while (i < len);
              }

              for (rule in rules) {
                rules[rule].load_id();
              }
              ;

              //Primo parsing.
              //Aggiorniamo lo stato di tutti gli input.
              for (node in this.tree) {
                //Attacchiamo al DOM la 'regola'
                node = this.tree[node];
                node.check();
              }
              //Aggiorniamo lo stato di tutti gli input.
              for (group in group_list) {
                //Attacchiamo al DOM la 'regola'
                node = this.tree[group];
                if (node != undefined) {
                  node.check();
                }
              }
            },
            parse: function (list, default_values) {
              // se la lista è vuota gestisce automaticamente tutti gli elementi
              // del DOM
              if (list === undefined) {
                list = $(document).find('input,select,textarea,[mandatory],[enabled],[format],[mandatory_enabled],[valid]');
              } else if (list.length === 0) {
                return; //Ritorna se la lista è vuota
              }

              //se parent non è passato prende tutti i figli che definiscono l'attributo
              if (default_values === undefined) {
                default_values = {
                  mandatory: 'false',
                  enabled: 'true',
                  valid: 'true',
                  format: '',
                  expression: ''
                };
              }
              //Separazione mandatory enabled
              $.each(list.filter('[mandatory_enabled]'), function (index, elem) {
                $(elem).attr('mandatory', $(elem).attr('mandatory_enabled'));
                $(elem).attr('enabled', $(elem).attr('mandatory_enabled'));

                $(elem).removeAttr('mandatory_enabled');
              });

              //prepariamo tutti gli input
              $.each(list.filter('input,select,textarea'), function (index, elem) {
                validator.build_tree_cache(elem, default_values);
              });


              //costruiamo per l'erediatarietà delle proprietà
              //filtra tutti gli elementi che non sono 'input'
              // e che non hanno parenti nella lista corrente
              list.not('input,select,textarea').filter(function (index) {
                return $(this).parents().filter(list).length === 0;
              }).each(function (index, elem) {
                var elem_sub_value;
                //Gestione mandatory enabled.
                elem_sub_value = {
                  mandatory: $(elem).attr('mandatory'),
                  enabled: $(elem).attr('enabled'),
                  valid: $(elem).attr('valid'),
                };

                //creazione dei nuovi parametri di default
                elem_sub_value = validator.merge_default(
                        elem_sub_value,
                        default_values);

                //richiama la lista per sovrascrivere con le proprietà ereditate
                //questa volta prende anche gli input senza proprietà 'speciali' in
                //modo rendere l'ereditarietà completa per i figli.
                validator.parse($(elem).find('input,select,textarea,[mandatory],[enabled],[format],[valid],[mandatory_enabled]'), elem_sub_value);
              });
            },
            //costruisce un nodo
            tree_cache: {},
            build_tree_cache: function (element, default_values) {
              //fake built node!
              var id = element.getAttribute('id').replace(/-/g, '_'),
                      cached_obj = this.tree_cache[id];
              if (cached_obj !== undefined) {
                delete this.tree_cache[id];
              }
              this.tree_cache[id] = [element, default_values];
            },
            build_node: function (element, default_values) {
              var node = null,
                      group,
                      type = element.type;

              if (this.registered.length > 0) {
                var i = this.registered.length - 1, //index
                        handler = null;
                do {
                  handler = validator.registered[i];
                  if (handler.selector(element)) {
                    node = new handler.node_class(element, default_values);
                    break;
                  }
                } while (i--);
              }

              if (node === null) {
                node = new Node(element, default_values);
              }

              //lo aggiunge al contenitore delle validazioni
              delete validator.tree[node.identifier];
              validator.tree[node.identifier] = node;

              /* issue: #45 */
              if (type === 'radio') {
                var radio_group = validator.tree[element.getAttribute('name')];
                if (typeof radio_group === 'undefined') {
                  //l'elemento deve essere sovrascritto più volte per prendere le regole corrette.
                  node = new RadioNode(element, default_values);
                  validator.tree[node.identifier] = node;

                  node.push(element); // Aggiunta al gruppo del primo elemento incontrato.
                } else if (radio_group instanceof RadioNode) {
                  //aggiungiamo al gruppo l'elemento.
                  radio_group.push(element);
                }
              }
              /* issue: #72 */
              else if (type === 'checkbox') {
                group = element.getAttribute('group');
                if (group !== null) {
                  var check_group = validator.tree[group];
                  if (typeof check_group === 'undefined') {
                    //l'elemento deve essere sovrascritto più volte per prendere le regole corrette.
                    node = new CheckGroup(element, default_values);
                    validator.tree[node.identifier] = node;

                    node.push(element); // Aggiunta al gruppo del primo elemento incontrato.
                  } else if (check_group instanceof CheckGroup) {
                    //aggiungiamo al gruppo l'elemento.
                    check_group.push(element);
                  }
                }
              }
            },
            //Aggiunge ad un oggetto le proprietà di default
            merge_default: function (obj, default_values) {

              //Aggiungiamo altre propietà all'oggetto.
              var props, value;
              for (props in default_values) {
                value = $(obj).attr(props);

                if (value === undefined) {
                  value = default_values[props];
                } else if (value === '') {
                  value = default_values[props];
                }

                obj[props] = value;
              }


              return obj;
            },
            rule_factory: function (rule, context) {
              var hash = rule.hashCode();
              var value = rules[hash];
              if (value !== undefined) {
                return value;
              } else {
                return new Rule(rule, context);
              }
            },
            hazard_statements: ['H200', 'H201', 'H202', 'H203', 'H204', 'H205',
              'H220', 'H221', 'H222', 'H223', 'H224', 'H225', 'H226', 'H228', 'H240', 'H241',
              'H242', 'H250', 'H251', 'H252', 'H260', 'H261', 'H270', 'H271', 'H272', 'H280',
              'H281', 'H290', 'H300', 'H301', 'H302', 'H304', 'H310', 'H311', 'H312', 'H314',
              'H315', 'H317', 'H318', 'H319', 'H330', 'H331', 'H332', 'H334', 'H335', 'H336',
              'H340', 'H341', 'H350', 'H351', 'H360', 'H361', 'H362', 'H370', 'H371', 'H372',
              'H373', 'H400', 'H410', 'H411', 'H412', 'H413', 'EUH001', 'EUH006', 'EUH014',
              'EUH018', 'EUH019', 'EUH044', 'EUH029', 'EUH031', 'EUH032', 'EUH066',
              'EUH070', 'EUH071', 'EUH059', 'EUH201', 'EUH201', 'EUH202', 'EUH203',
              'EUH204', 'EUH205', 'EUH206', 'EUH207', 'EUH208', 'EUH209', 'EUH209A',
              'EUH210', 'EUH401', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8',
              'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18',
              'R19', 'R20', 'R21', 'R22', 'R23', 'R24', 'R25', 'R26', 'R27', 'R28',
              'R29', 'R30', 'R31', 'R32', 'R33', 'R34', 'R35', 'R36', 'R37', 'R38',
              'R39', 'R40', 'R41', 'R42', 'R43', 'R44', 'R45', 'R46', 'R47', 'R48',
              'R49', 'R50', 'R51', 'R52', 'R53', 'R54', 'R55', 'R56', 'R57', 'R58',
              'R59', 'R60', 'R61', 'R62', 'R63', 'R64', 'R65', 'R66', 'R67', 'R68',
              'R14/15', 'R15/29', 'R20/21', 'R21/22', 'R20/22', 'R20/21/22', 'R23/24',
              'R24/25', 'R23/25', 'R23/24/25', 'R26/27', 'R26/28', 'R27/28',
              'R26/27/28', 'R36/37', 'R37/38', 'R36/38', 'R36/37/38', 'R39/23',
              'R39/24', 'R39/25', 'R39/23/24', 'R39/23/25', 'R39/24/25', 'R39/23/24/25',
              'R39/26', 'R39/27', 'R39/28', 'R39/26/27', 'R39/26/28', 'R39/26/27/28',
              'R42/43', 'R48/20', 'R48/21', 'R48/22', 'R48/20/21', 'R48/20/22',
              'R48/21/22', 'R48/20/21/22', 'R48/23', 'R48/24', 'R48/25', 'R48/23/24',
              'R48/23/25', 'R48/24/25', 'R48/23/24/25', 'R50/53', 'R51/53', 'R52/53',
              'R68/20', 'R68/21', 'R68/22', 'R68/20/21', 'R68/20/22', 'R68/21/22',
              'R68/20/21/22'
            ],
            cf_translate_table: {
              even: {
                '0': 0,
                '1': 1,
                '2': 2,
                '3': 3,
                '4': 4,
                '5': 5,
                '6': 6,
                '7': 7,
                '8': 8,
                '9': 9,
                'A': 0,
                'B': 1,
                'C': 2,
                'D': 3,
                'E': 4,
                'F': 5,
                'G': 6,
                'H': 7,
                'I': 8,
                'J': 9,
                'K': 10,
                'L': 11,
                'M': 12,
                'N': 13,
                'O': 14,
                'P': 15,
                'Q': 16,
                'R': 17,
                'S': 18,
                'T': 19,
                'U': 20,
                'V': 21,
                'W': 22,
                'X': 23,
                'Y': 24,
                'Z': 25
              },
              odd: {
                '0': 1,
                '1': 0,
                '2': 5,
                '3': 7,
                '4': 9,
                '5': 13,
                '6': 15,
                '7': 17,
                '8': 19,
                '9': 21,
                'A': 1,
                'B': 0,
                'C': 5,
                'D': 7,
                'E': 9,
                'F': 13,
                'G': 15,
                'H': 17,
                'I': 19,
                'J': 21,
                'K': 2,
                'L': 4,
                'M': 18,
                'N': 20,
                'O': 11,
                'P': 3,
                'Q': 6,
                'R': 8,
                'S': 12,
                'T': 14,
                'U': 16,
                'V': 10,
                'W': 22,
                'X': 25,
                'Y': 24,
                'Z': 23
              }
            },
            //Formattazione disponibili
            formats: {
              number: /^[\d]*$/,
              floating: /^[-+]?([0-9]*[\.,][0-9]+|[0-9]+)$/,
              positive_float: /^[+]?([0-9]*[\.,][0-9]+|[0-9]+)$/,
              negative_float: /^-([0-9]*[\.,][0-9]+|[0-9]+)$/,
              alphabetic: /^[\w]*$/,
              alphanumeric: /^[\w\d]*$/,
              alnumhyphen: /^[\w\d\-_]*$/,
              alnumhyphenat: /^[\w\d\-_@]*$/,
              alphaspace: /^[\w\d\-_ \n\r\t]*$/,
              email: /^([\w\d._%\-]+@[\w\d.\-]+\.[\w]{2,4})/,
              pec: /^([\w\d._%\-]+@[\w\d.\-]+\.[\w]{2,4})/,
              cap: /^[\d]{5}$/,
              provincia: /^[\w]{2}$/,
              cf: /(^[\w]{6}[\d]{2}[\w]{1}[\d]{2}[\w]{1}[\d]{3}[\w]{1}$|^TIN:(\d{8,11}$|\d{13}$|\d{8}\w$|[LlKkXxYyZzMm]\d{7}\w$|\d{6}[+\-A]\d{3}[\d\w]$|\d{7}\w{1,2}$|\w{2}\d{6}[AaBbCcDd]$))/,
              piva: /^[\d]{11}$/,
              cfpiva: /(^[\w]{6}[\d]{2}[\w]{1}[\d]{2}[\w]{1}[\d]{3}[\w]{1}$|^TIN:(\d{8,11}$|\d{13}$|\d{8}\w$|[LlKkXxYyZzMm]\d{7}\w$|\d{6}[+\-A]\d{3}[\d\w]$|\d{7}\w{1,2}$|\w{2}\d{6}[AaBbCcDd]$))|^[\d]{11}$/,
              catcom: /^[\w]{1}[\d]{3}/,
              catcat: /^[A-Ea-e]{1}\/[\d]{1}/,
              date: /^[\d]{1,2}\/[01]{0,1}[0-9]{1}\/[\d]{4}$|^gg\/mm\/aaaa$/,
              date_born: /^[\d]{1,2}\/[01]{0,1}[0-9]{1}\/[\d]{4}$|^gg\/mm\/aaaa$/,
              time: /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$|^hh\/mm$/,
              numero_cas: /^[0-9]{1,6}-[0-9]{2}-[0-9]{1}$/,
              frase_h: /^H[0-9]{3}|R[0-9]{3}|EUH[0-9]{3}[A]{0,1}$/,
              regular_expression: /./,
              valuta_positiva: /^[0-9]+\,[0-9]{2}$/,
              valuta_negativa: /^-?[0-9]{1,3}(?:[0-9]*(?:[,][0-9]{1,2})?|(?:\.[0-9]{3})*(?:,[0-9]{1,2})?)$/,
              ateco: /^[0-9]{2}\.[0-9]{2}\.[0-9]{1,2}$|^es\. 14\.11\.00$/
            },
            Node: null,
            Rule: null
          },
  //Oggetti...
  Node = function (element, default_values) {
    //Node di una regola sull'input
    if (element !== undefined) {
      //Overwrite default settings..
      this.props_overwrite = function (rulename, element, default_values) {
        var value = element.getAttribute(rulename);

        if (value === null || value === '') {
          this[rulename + '_rule'] = default_values[rulename];
        } else {
          this[rulename + '_rule'] = value;
        }
      };

      this.props_overwrite('mandatory', element, default_values);
      this.props_overwrite('enabled', element, default_values);
      this.props_overwrite('valid', element, default_values);

      this.element = element;

      this.format = element.getAttribute('format');
      if (this.format == 'regular_expression') {
        this.expression = element.getAttribute('expression');
      }
      //Sostituzione caratteri malformati
      this.identifier = element.getAttribute('id').replace(/-/g, '_');

      //Recupero descrizione campo:
      var value;
      value = element.getAttribute('label');
      if (value === null || value === '') {
        value = this.identifier;
      }
      this.description = value;

      //Metodi esposti nel DOM
      this.formatted = undefined;
      this.filled = undefined;
      this.allowed = undefined;

      this.correct = false;

      this._listener_rule = new Array(); //Regole in ascolto sul nodo
      //Valore di default. permette di prepolare i campi.
      this.default_value = null;

      //Default placeholder
      var format = this.format,
              _placeholder = '';

      if (format == 'date') {
        _placeholder = 'gg/mm/aaaa';
      } else if (format == 'time') {
        _placeholder = 'hh:mm';
      } else if (format == 'ateco') {
        _placeholder = 'es. 14.11.00';
      } else if (format == 'valuta_positiva' || format == 'valuta_negativa') {
        _placeholder = '0,00';
      }

      $(this.element).attr('placeholder', _placeholder);

    }
    //Aggiunge una regola in ascolto sul nodo
    this.push_listener_rule = function (rule) {
      //Se non è presente il nodo lo aggiunge
      if (this._listener_rule.indexOf(rule) === -1) {
        this._listener_rule.push(rule);
      }
    };
    //Aggiorna tutte le regole in ascolto sul nodo
    this.refresh_listener_rule = function (node_stack) {
      var rules = this._listener_rule.concat();
      //Not asyncronus!
      if (rules.length > 0) {
        do {
          var rule = rules.shift();
          if (typeof rule !== 'undefined') {
            rule.evalutate(node_stack);
          }
        } while (rules.length);
      }
    };

    //Se il campo è disabilitato ritorna false.
    this.checked = function () {
      return this.element.checked && !this.element.disabled;
    };

    this.value = function () {
      return this.element.value;
    };
    //Setta il valore del nodo corrente.
    this.set_value = function (value) {
      this.element.value = value;
      // FIX perdita dati: scatena l'evento change solo se onChange non e' definito o non contiene la chiamata alla funzione copiaDatiDa
      if(!this.element.onchange || this.element.onchange.toString().indexOf('copiaDatiDa') === -1) {
        $(element).change();
        this.check();
      }
    };

    this.check_value = function (values) {
      return values.indexOf(this.element.value) > -1;
    };

    //Controlla il nodo corrente che tutte le regole siano valide.
    this.check = function (node_stack, check_dynamic) {
      check_dynamic = typeof check_dynamic !== 'undefined' ? check_dynamic : true;

      //Controllo veloce
      if (typeof this.enabled === 'undefined' || typeof this.mandatory === 'undefined') {
        return;
      }

      //Rimuoviamo tutti gli errori associati al nodo.
      if (this.error != undefined && this.error != null) {
        this.error.remove();
        this.error = null;
      } else {
        this.error = null;
      }

      //Catena di stack per spezzare l'esecuzione di comandi
      //ricorsivi
      if (typeof node_stack === 'undefined') {
        node_stack = new Array();
      }
      //Aggiunto alla catena di stack il nodo
      node_stack.push(this);

      //Rimuove entrambe le classi.
      $(this.element).removeClass('mandatory format valid');

      //Controlla i valori di default
      if (check_dynamic) {
        this.dynamic_check_setter();
        this.dynamic_value_setter();
      }

      var group = this.group;
      if (group !== undefined && !group.allowed) {
        this.allowed = false;
      } else {
        this.allowed = this.enabled_check();
        if (this.allowed) {
          this.handle_default_value();
          this.filled = this.mandatory_check(); //Obbligatorietà del campo
          if (this.filled) {
            this.formatted = this.format_check(); //Format del campo
            if (this.formatted) {
              this.isvalid = this.valid_check();
            }
          }
        }
      }
      //Un campo è considerato corretto quando è formattato correttamente ha soddisfatto l'obbligatorietà
      //oppure è disabilitato.
      this.correct = this.formatted && this.filled && this.allowed && this.isvalid;

      //Scateniamo l'evento rule change
      this.refresh_listener_rule(node_stack);
    };

    this.handle_default_value = function () {
      //handler dei valori di default
      if (this.default_value !== null && this.default_value !== undefined) {
        var value = this.value();
        if (value === '' || value === null || value === undefined) { //Quando il campo non è 'riempito' ed è abilitato.
          var tag = this.element.tagName,
                  type = this.element.type;
          if (tag.toUpperCase() === 'SELECT') {
            if (this.element.options !== undefined) {
              var i = this.element.options.length - 1,
                      opt;
              if (i > -1) {
                do {
                  opt = this.element.options[i];
                  if (opt.value === this.default_value) {
                    //opt.setAttribute("selected", "selected");
                    this.element.value = this.default_value;
                    this.default_value = null; //lo estrapola una sola volta
                    break;
                  }
                } while (i--);
              }
            }
          } else { //input, textarea
            if (type === 'checkbox' || type === 'radio') {

              this.element.checked = this.default_value;
            } else { //textbox
              this.element.value = this.default_value;
            }
            this.default_value = null; //lo estrapola una sola volta
          }
        }
      }

    };

    this.dynamic_check_setter = function () {
      //Dynamic check:
      if (this.dynamic_check !== undefined) {
        var result = this.dynamic_check.result();
        if (result || this.previus_dynamic_check) {
          if (result) {
            //Se è verificato bisogna settare l'elemento checkato.
            $(this.element).prop('checked', true);
            this.previus_dynamic_check = true;
            return true;
          }

          //Issue: #84
          else {
            $(this.element).prop('checked', false);
            this.previus_dynamic_check = false;
            return false;
          }
        }

      }

      return false;
    };

    this.dynamic_value_setter = function () {
      //Dynamic check:
      if (this.dynamic_value !== undefined) {
        var result = this.dynamic_value.result();
        if (result !== undefined) {
          //Se è verificato bisogna settare l'elemento il valore dinamico.
          this.element.value = result;
          return true;
        } else {
          if (this.old_value !== undefined && this.old_value !== "") {
            //Se è verificato bisogna settare l'elemento il valore dinamico.
            this.element.value = this.old_value;
            return true;
          }
        }

      }

      return false;
    };

    this.enabled_check = function () {
      //settiamo l'abilitazione o meno
      var result = this.enabled.result(),
              el = this.element,
              type = el.type;

      if (!this.enabled.result()) {
        //Svuotare i textbox e i select
        if (type !== 'radio' && type !== 'checkbox') { //#180
          if (value !== '' && this.default_value == '') {
            this.default_value = el.value; //salvo il valore prima di svuotare.
          }
          el.value = '';
        } else {
          this.default_value = el.checked;
          el.checked = false;
        }
        el.disabled = true;
        return false;
      } else {
        el.disabled = false;
      }

      return true;
    };

    this.mandatory_check = function () {
      //se il campo è obbligatorio controlla che sia compilato
      if (this.mandatory.result()) {
        var value = this.value();
        if (value === undefined || $.trim(value) === '') { //Issue #88
          $(this.element).addClass('mandatory');
          //Riporta errore di mancata compilazione.
          if (this.error === null){
            this.error = new MandatoryError(this);
          }
          return false;
        }
      }

      return true;
    };

    //Controlla la formattazione del campo
    //Ritorna true se il campo è compilato correttamente, ritorna false
    //se il campo non è formattato correttamente.
    this.format_check = function () {
      //Se il campo non è compilato non controllare la formattazione
      var value = this.value(),
              upper_value = value.toUpperCase(),
              format = this.format,
              format_regex = validator.formats[this.format],
              result = false;

      //Valore vuoto non controlla la formattazione
      if (value == '') {
        $(this.element).removeClass('format');
        return true;
      }

      //Formato insesistente o non valido
      if (format === null || format === '') {
        return true; //Formato inesistente per questo campo.
      } else if (format_regex == undefined) {
        //ERRORE formato inesistente
        return false;
      }

      if (format == 'regular_expression') {
        result = value.match(new RegExp(this.expression));
      } else if (format == 'frase_h') {
        //Controllo 'Frasi H'
        //href: http://it.wikipedia.org/wiki/Frasi_H
        var tokens = upper_value.split(' ');
        i = tokens.length - 1;
        var token;
        var exists;

        result = true;
        if (i > 0) {
          do {
            token = tokens[i];
            exists = validator.hazard_statements.indexOf(token);
            result = exists > -1;
          } while (result && i--);
        }
      } else if (this.format == 'numero_cas') {
        //Controllo 'Numero CAS'
        //href: http://it.wikipedia.org/wiki/Numero_CAS
        var i = value.length - 3;
        controll = parseInt(value[value.length - 1]);
        digit = 0,
                sum = 0,
                mul = 1;

        if (i > 0) {
          do {
            digit = parseInt(value[i], '10');
            if (!isNaN(digit)) {
              sum += digit * mul;
              mul++;
            }
          } while (i--);

          result = (sum % 10) == controll;
        }
      } else if (format == 'cf' || format == 'cfpiva') {
        if (upper_value.length == 16) {
          //Controllo carattere finale codice fiscale
          //href: http://it.wikipedia.org/wiki/Codice_fiscale#Generazione_del_codice_fiscale
          var cf = check_omocodia(upper_value),
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
        } else {
          result = value.match(format_regex) != null;
        }
      } else {
        //infine usa le regex per il controllo
        result = value.match(format_regex) != null;
      }

      if (result == null || result[0] == '' || result == false) {
        //Formattazione non valida
        $(this.element).addClass('format');
        //Riporta errore di malformattazione.
        this.error = new FormatError(this, '');

        return false;
      }
      //Formattazione valida
      return result;
    };

    this.valid_check = function () {

      // Controllo la condizione di validità
      if (!this.valid.result()) {
        $(this.element).addClass('valid');
        //Riporta errore di mancata compilazione.
        if (this.error === null){
          this.error = new ValidError(this);
        }
        return false;
      }

      return true;
    };
    //Lega tutti gli eventi che implicano l'oggetto.
    this.load_event = function () {
      //Carichiamo le regole dopo.
      this.mandatory = validator.rule_factory(this['mandatory_rule'], this);
      this.enabled = validator.rule_factory(this['enabled_rule'], this);
      this.valid = validator.rule_factory(this['valid_rule'], this);

      //Gestione check dinamico.
      var check = this.element.getAttribute('dynamic_check'),
          value = this.element.getAttribute('dynamic_value');

      if (check !== null) {
        this.dynamic_check = validator.rule_factory(check, this);
        this.dynamic_check.register(this);
        this.previus_dynamic_check = false; //Issue: #83
      }

      //Gestione value dinamico.
      if (value !== null) {
        this.dynamic_value = validator.rule_factory(value, this);
        this.dynamic_value.register(this);
      }

      this.change_self_handler(); //Gestisce il cambiamenti del nodo stesso.

      if (this.enabled.key === this.mandatory.key) {
        //Se la regola è la stessa si registra su uno solo.
        this.enabled.register(this);
      } else {
        this.enabled.register(this); //Registra alla regola enabled.
        this.mandatory.register(this); //Registra alla regola mandatory.
      }

      this.valid.register(this);
    };

    this.change_self_handler = function () {
      //Devo legarlo al cambiamento delle regole che lo compongono.
      this.old_value = this.element.value;
      $(this.element).on('change.self input.self blur', {
        context: this
      }, function (e) {
        var node = e.data.context,
            old_value = node.old_value,
            value = node.element.value;

        if (old_value !== value) {
          node.old_value = node.element.value; //evita che il cambiamento sia richiamato!
          //Grazie a 'call' faccio l'override del 'this' nel medoto.
          node.check.call(node);
        }
      });

      $(this.element).on('blur', {
        context: this
      }, function (e) {
        e.data.context.element.value = $.trim(e.data.context.element.value);
      });
    };

  },
          Rule = function (rule, context) {

            if (rule === undefined) {
              this._rule = '';
            } else {
              this._rule = rule;

            }

            this.key = rule.hashCode();
            this.valorizzatori = new Array();
            //this.context = context;

            this._involved_id = [];
            if (rule === 'true') {
              this._result = true;
            } else {
              this._result = false;
            }
            //this._result = false;

            this.result = function () {
              return this._result;
            };

            //Registra un nodo da chiamare alla modifica di questa regola.
            this._registered_node = new Array();
            this.register = function (node) {
              //aggiunge l'elemento solo se non è registrato.
              if (this._registered_node.indexOf(node) == -1) {
                this._registered_node.push(node);
              }
            };

            //Valuta la regola corrente nel contesto fornito
            this.evalutate = function (node_stack) {
              var i = this._registered_node.length - 1,
                      len = 0;

              if (i < 0) {
                return; //inutile valutare una regola con nessuno che la usa!
              }

              var rule = this._rule;
              if (rule === 'true') {
                this._result = true;
              } else if (rule === 'false') {
                this._result = false;
              } else {
                this._result = eval(rule);
              }

              //Do while boost performance.
              do {
                var node = this._registered_node[len];
                //Jump if node is already refreshed
                if (typeof node_stack !== 'undefined') {
                  if (node_stack.indexOf(node) > -1) {
                    len++; // Fix: #68
                    continue;
                  }
                }

                if (node instanceof RadioNode) {
                  //Gestione specifica gruppi di radio!
                  node.update_radio(node_stack);
                } else {
                  node.check(node_stack);
                }
                len++;
              } while (i--);
            };
            //carica tutti gli id
            this.load_id = function () {
              var i = 0,
                      unique_id = [],
                      _rules = this._rule.match(/#([\w\d_-]+)/g);

              if (_rules == null) {
                return; //nessun ID nelle regole!
              }

              for (; i < _rules.length; i++) {
                var id = _rules[i].substring(1);
                id = id.replace(/-/g, '_');

                if (this[id] !== undefined) {
                  if (!(this[id] instanceof Node)) {
                    //Se il nome è già occupato nel contesto corrente ritorno un #errore
                    console.error("ID con stesso nome di una propeties!");
                  }
                } else {
                  this[id] = validator.tree[id];
                }
                //Aggiungiamo all'elemento la regola da richiamare in caso di cambiamento
                if (this[id] !== undefined) {
                  this[id].push_listener_rule(this);
                }
              }

              //this._involved_id = unique_id;

              //Rimuoviamo # dalle regole:
              this._rule = this._rule.replace(/#/g, 'this.');
              this._rule = this._rule.replace(/\sand\s/g, ' && ');
            };

            //Aggiungo alle regole globali.
            rules[this.key] = this;
            //Inizializzazione
            try {
              this._result = eval(this._rule);
            } catch (e) {
            }
          },
          ErrorHandler = function (node) {
            if (node !== undefined) {
              this.description = node.description;
              this.node = node;
              this.id = $(node.element).attr('id');

              //Aggiungi alla lista degli errori generali se il node è instanziato correttamente.
              validator.errors.push(this);
            }

            //Ritorna una stringa che descrive l'errore.
            this.stringfy = function () {
              return "Il campo " + this.description + " non è compilato correttamente.";
            };

            //Rimuove l'ErrorHandlere dal log degli errori.
            this.remove = function () {
              if (validator.errors.length === 1) {
                validator.errors = new Array();
              } else {
                var position = $.inArray(this, validator.errors);
                if (position >= 0) {
                  validator.errors.splice(position, 1);
                }
              }
              delete this.node.error;
            };
          },
          FormatError = function (node, format_description) {
            ErrorHandler.call(this, node);
            this.format_description = format_description;

            this.stringfy = function () {
              return '<p><a onclick="close_error()" class="error-link" href="#' + this.id + '">' + this.description + "</a>,non è formattato correttamente.</p>";
            };
          },
          MandatoryError = function (node) {
            ErrorHandler.call(this, node);

            this.stringfy = function () {
              return '<p><a onclick="close_error()" class="error-link" href="#' + this.id + '">' + this.description + "</a>, è obbligatorio.</p>";
            };
          },
          ValidError = function (node) {
            ErrorHandler.call(this, node);

            this.stringfy = function () {
              return '<p><a onclick="close_error()" class="error-link" href="#' + this.id + '">' + this.description + "</a>, non è valido.</p>";
            };
          },
          CheckNode = {
            selector: function (element) {
              var attr = element.getAttribute('type');
              return attr === 'checkbox' || attr === 'radio';
            },
            get_identifier: function (element) {
              return element.getAttribute('id').replace(/-/g, '_');
            },
            node_class: function (element, default_values) {
              Node.call(this, element, default_values);

              this.previus_check = element.checked;

              this.set_value = function (value) {
                if (this.element.value == value) {
                  this.element.checked = true;
                } else {
                  this.element.checked = false;
                }

                this.check();
              };

              this.update_status = function () {
                this.previus_check = this.element.checked;
              };

              this.handle_default_value = function () {
                //handler dei valori di default
                //Issue #159
                if (this.default_value == true) { //Se il valore di default non è nullo
                  if (this.allowed) { //Quando il campo non è 'riempito' ed è abilitato.
                    if (!this.element.checked) { //Lo cotrolliamo solo se non è abilitato
                      $(this.element).trigger('click.self');
                      $(this.element).prop('checked', true);
                    }
                    this.default_value = null; //lo estrapola una sola volta
                  }
                }
              };
              /*Override OnClick issue #45*/
              this.change_self_handler = function () {
                $(this.element).on('click.self', {
                  context: this
                }, function (e) {
                  //Grazie a 'call' faccio l'override del 'this' nel medoto.

                  var context = e.data.context;
                  var el = context.element,
                          previus = context.previus_check;
                  //Preveniamo il check di campi 'bloccati'
                  context.dynamic_check_setter();
                  if (el.checked !== previus) {
                    //e.data.context.check.call( e.data.context );
                    context.previus_check = el.checked; // aggiornata la differenza prima di ogni altro controllo
                    if (typeof context.group !== 'undefined') {
                      //Aggiorniamo il gruppo
                      context.group.update_radio();
                    } else {
                      //Se non ha un gruppo si aggiorna il singolo radio.
                      context.check();
                    }
                  }
                });
              };
            }
          },
  SelectNode = {
    selector: function (element) {
      return element.tagName === 'SELECT';
    },
    get_identifier: function (element) {
      return element.getAttribute('id').replace(/-/g, '_');
    },
    node_class: function (element, default_values) {
      Node.call(this, element, default_values);

      // Define options for select.
      var options = {};
      $(this.element).find('option').each(function(index, element) {
        options[$(element).val()] = $(element).text();
      });

      this.options = options;

      this.set_options = function (options) {
        // If undefined or equal, return immediatly.
        if (!options || options === this.options) {
          return;
        }

        $(this.element).find('option').remove();
        this.options = options;

        if (this.label) {
          $(this.element).append($('<option>', {value: '', text: this.label}));
        }

        for (var key in options) {
          $(this.element).append($('<option>', {
            value: key,
            text: options[key]
          }));
        }
      };

      this.handle_default_value = function () {
        //handler dei valori di default
        if (this.default_value) {
          var value = this.value();
          if (!value) {
            //Quando il campo non è 'riempito' ed è abilitato.
            if (this.element.options) {
              var node = this;
              $.map(this.element.options, function(opt) {
                if (opt.value == node.default_value) {
                  node.element.value = node.default_value;
                  node.default_value = null;
                }
              });
            }
          }
        }
      };

      this.option_group = function () {
        var index = this.element.selectedIndex;
        if (index > -1) {
          var opt_group_label = this.element.options[index].parentNode.label;

          if (typeof opt_group_label !== "undefined") {
            return opt_group_label;
          }
        }

        return "";
      };

      this.dynamic_value_setter = function () {
        if (this.dynamic_value === undefined) {
          return false;
        }

        var result = this.dynamic_value.result();
        if (!result) {
          return false;
        }

        this.set_options(result);
        return false;
      };
    },
  },

  RadioNode = function (element, default_values) {
    Node.call(this, element, default_values);

    if (element !== undefined) {
      //Load group rules
      var group = element.getAttribute('group'),
              name = element.name,
              label;

      if (group !== null) {
        this.group_rule = document.getElementById(group);
        this.name = group;
        this.identifier = group.replace(/-/g, '_');
        this.description = group;
      } else {
        this.group_rule = document.getElementById(name);
        this.name = name;
        this.identifier = name.replace(/-/g, '_');
        this.description = name;
      }

      if (this.group_rule !== null) {
        this.props_overwrite('mandatory', this.group_rule, default_values);
        this.props_overwrite('enabled', this.group_rule, default_values);
        this.props_overwrite('valid', this.group_rule, default_values);
      }
      //Issue: #78
      if ((label = this.group_rule.getAttribute('label')) !== null) {
        this.description = label;
      }
      /*MEMORY LEAK?*/

      //Impostiamo una lista di elementi.
      this.element = new Array();
    }

    this.push = function (el) {
      //Aggiunge un nodo al gruppo a meno che sia già nella lista.
      if (this.element.indexOf(el) == -1) {
        this.element.push(el);

        if (validator.tree[el.id.replace(/-/g, '_')] !== undefined) {
          validator.tree[el.id.replace(/-/g, '_')].group = this;
        }
      }
    };

    //this.push(element);
    //Se il campo è disabilitato ritorna false.
    this.checked = function () {
      return this.checked_element() !== null;
      //return $(this.element).filter('input:radio:checked').length == 1 && !$(this.element).prop('disabled');
    };
    this.value = function () {
      var checked = this.checked_element();
      if (checked !== null) {
        return checked.value;
      }
    };

    this.check_value = function (values) {
      var checked = this.checked_element();
      if (checked !== null) {
        return values.indexOf(this.checked_element().value) > -1;
      }

      return false;
    };

    this.checked_element = function () {
      var elements = this.element,
              el;
      var i = elements.length - 1;
      do {
        el = elements[i];
        if (el.checked) {
          return el;
        }
      } while (i--);

      return null;
    };

    //Spunta il radio button con il valore uguale a value
    this.set_value = function (value) {
      var elements = this.element,
              el;
      var i = elements.length - 1;
      do {
        el = elements[i];
        if (el.value === value) {
          el.checked = true;
          this.update_radio();
          break;
        }
      } while (i--);
    };

    this.handle_default_value = function () {
      //handler dei valori di default
      var value = this.default_value;
      this.default_value = null;
      this.set_value(value); //semplicemente questo!
    };

    /*Non previsto su gruppo radio*/
    this.dynamic_check_setter = function () {
      return false;
    }; /*OVERRIDE*/
    this.format_check = function () {
      return true;
    }; /*OVERRIDE*/

    this.enabled_check = function () {
      var elements = this.element,
              i = elements.length - 1,
              result = this.enabled.result(),
              el,
              el_node;

      if (!result) {
        do {
          el = elements[i];
          el.disabled = true;
          el.checked = false;
          el_node = $(el).data('rule');
          //el_node.update_status();
          el_node.refresh_listener_rule();
          //.refresh_listener_rule(node_stack);
        } while (i--);

        //Aggiorniamo solo al cambiamento! il nodo che era selezionato
        //validator.tree[this.current_check.id].check();
        //this.update_radio(); //aggiorniamo lo stato.
        return false;
      } else {
        do {
          el = elements[i];
          el_node = $(el).data('rule');
          //Issue
          el.disabled = false;
          el_node.check();
          //el_node.refresh_listener_rule();
        } while (i--);
      }

      return true;
    };

    this.mandatory_check = function () {
      //se il campo è obbligatorio controlla che sia compilato
      if (this.mandatory.result()) {
        //se nessun elemento è checkato ritorna errore.
        if (!this.checked()) {
          $(this.element).addClass('mandatory');
          //Riporta errore di mancata compilazione.
          if (this.error === null) {
            this.error = new MandatoryError(this);
          }
          return false;
        }
      }

      return true;
    };
    //aggiorna lo stato attuale dei radio e norifica anche la deselezione.
    this.update_radio = function (node_stack) {
      //se esiste un elemento precedentemente checkato

      var next = this.checked_element(),
              previus = this.current_check;

      if (next !== previus) {
        //Se il precedente non è nullo, setta lo stato attuale
        if (previus !== null) {
          previus.checked = false;
        }

        this.current_check = next;
        this.refresh_listener_rule(node_stack);
        //Update singoli nodi
        if (previus !== null) {
          var previus_node = validator.tree[previus.id];
          previus_node.previus_check = false; //update state
          previus_node.check();
        }

        if (next !== null) {
          validator.tree[next.id].check();
        }
      }

      this.check(); //test!

    };

    //Lega tutti gli eventi che implicano l'oggetto.
    this.load_event = function () {
      //Carichiamo l'elemento correntemente checkato
      this.current_check = this.checked_element();
      //Carichiamo le regole dopo.
      this.mandatory = validator.rule_factory(this['mandatory_rule'], this);
      this.enabled = validator.rule_factory(this['enabled_rule'], this);
      this.valid = validator.rule_factory(this['valid_rule'], this);


      if (this.enabled.key === this.mandatory.key) {
        //Se la regola è la stessa si registra su uno solo.
        this.enabled.register(this);
      } else {
        this.enabled.register(this); //Registra alla regola enabled.
        this.mandatory.register(this); //Registra alla regola mandatory.
      }

      this.valid.register(this);
    };
  },
  CheckGroup = function (element, default_values) {
            RadioNode.call(this, element, default_values);
            this.previus_state = new Array();
            //Se il campo è disabilitato ritorna false.
            this.checked = function () {
              return this.checked_element().length > 0;
            };

            this.checked_element = function () {
              var elements = this.element,
                      checkeds = new Array(),
                      el;
              var i = elements.length - 1;
              do {
                el = elements[i];
                if (el.checked) {
                  checkeds.push(el);
                }
              } while (i--);

              return checkeds;
            };

            //aggiorna lo stato attuale dei radio e norifica anche la deselezione.
            this.update_radio = function (node_stack) {
              var current_check = this.checked_element(),
                      previus_check = this.previus_state,
                      to_check = arrayUnique(current_check.concat(previus_check)),
                      i = to_check.length - 1,
                      checkbox,
                      node;

              if (i > -1) {
                do {
                  node = $(to_check[i]).data('rule');
                  node.check();
                  node.update_status();
                } while (i--);
              }
              this.previus_state = current_check;

              this.check(); //test!
            };
  };

  validator.Node = Node;
  validator.Rule = Rule;
  //Overrides
  FormatError.prototype = new ErrorHandler;
  FormatError.prototype.constructor = FormatError;
  MandatoryError.prototype = new ErrorHandler;
  MandatoryError.prototype.constructor = MandatoryError;
  ValidError.prototype = new ErrorHandler;
  ValidError.prototype.constructor = ValidError;
  RadioNode.prototype = new Node;
  RadioNode.prototype.constructor = RadioNode;
  CheckGroup.prototype = new RadioNode;
  CheckGroup.prototype.constructor = CheckGroup;

  validator.register(CheckNode);
  validator.register(SelectNode);
  //indexOf in IE8 and previus.
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (needle) {
      for (var i = 0; i < this.length; i++) {
        if (this[i] === needle) {
          return i;
        }
      }
      return -1;
    };
  }

  String.prototype.hashCode = function () {
    var hash = 0,
            i = 0,
            _char;
    if (this.length == 0)
      return hash;
    for (; i < this.length; i++) {
      _char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + _char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  function arrayUnique(array) {
    var a = array.concat(),
            i, j;
    for (i = 0; i < a.length; ++i) {
      for (j = i + 1; j < a.length; ++j) {
        if (a[i] === a[j]) {
          a.splice(j--, 1);
        }
      }
    }
    return a;
  }
  //Istanza globale.
  window.validator = validator;
})(window, undefined);

/*Dato il codice fiscale controlla se è omocodo e lo traduce nuovamente*/
function check_omocodia(codice_fiscale) {
  var translate_table = ['L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'],
          translate_index = [6, 7, 9, 10, 12, 13, 14],
          char_index = 0,
          index = 0,
          i = 0;

  //Scorre le posizioni in cui si possono inserire i caratteri
  for (; i < translate_index.length; i++) {
    index = translate_index[i];

    char_index = codice_fiscale.charAt[index];
    char_index = translate_table.indexOf(char_index);
    if (char_index > 0) { //se è presente nella tabella lo sostituisce
      codice_fiscale[index] = parseInt(char_index, '10');
    }
  }

  return codice_fiscale;
}
