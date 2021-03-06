qx.Class.define("formgenerator.FormGenerator",
{
  extend : qx.ui.core.Widget,
  construct : function(options) {

  	this.base(arguments);

    //установим менеджер разметки
  	var layout = new qx.ui.layout.Grid(10, 10);
  	this._setLayout(layout);

    //создадим модель
    this._createModel(options);

    //заполним форму элементами, и сделаем binding с моделью
    this._createFormItems(options);

    //setValidate сделаем
    if (this._validateArray.length) {
      var allValidateFunctions = function() {
        var returnedVals = [];//нужен, чтобы накопить сообщения об ошибках
        for (var i = 0; i < this._validateArray.length; i++) {
          var returnVal =  this._validateArray[i]();
          returnedVals.push(returnVal);
        }
        for (var i = 0; i < returnedVals.length; i++) {
          if (!returnedVals[i]) {
            this._manager.setInvalidMessage(this._invalidMessages.join("\n"));
            this._invalidMessages = [];
            return false;
          }
        }
        return true;
      }
      //либо замыкание, либо биндинг (в смысле привязка к контексту, а не биндинг qooxdoo), решил через биндинг сделать
      this._manager.setValidator(allValidateFunctions.bind(this));
    }

    //создадим кнопки
    this._createButtons(options);

    var setup = {
      border:  {color: "blue", width: 3, style: "solid"},
      options: {
        padding:         5,
        minHeight:       150,
        minWidth:        150,
        backgroundColor: "yellow"
      }
    }
    //Затем займемся внешним видом
    if (options.widget) {
      this._copy(setup, options.widget);
    }
    this._setWidgetStyle(setup);
  },
  members: {
    //паблик методы
    getModel: function() { return this._model; },
    getManager: function() { return this._manager; },
    _invalidMessages: [],
    addInvalidMessage: function(message) {
      this._invalidMessages.push(message);
    },
    //протектед свойства
    _model:           null,
    _controller:      null,
    _manager:         null,
    _modelProperties: [],//нужен, чтобы исключить биндинг двух элементов с одинаковым label на одну модель, т.е. в такой "плохой" ситуации забиндится только первый элемент
    _validateArray:   [],//массив ф-ций валидации, который будет заюзан для setValidation метода
    //протектед методы
    _setWidgetStyle: function(widget) {
      var options = {};
      if (widget.options) {
        options = widget.options;
      }
      if (widget.border) {
        options.decorator = new qx.ui.decoration.Single(widget.border.width, widget.border.style , widget.border.color);
      }
      this.set(options);
    },
    //создание модели с данными из формы
    //значения по умолчанию, если они допустимы (например для радиогруппы возможно значение из дискретного набора), то они установятся значениями модели.
    _createModel: function(options) {
      var items           = options.items;
      var modelSkeleton   = {};//каркас модели
      var modelProperties = [];//нужно, чтобы исключить переопределение свойства, в случае, если оно уже было определено
      for (var i = 0; i < items.length; i++) {
        for (var j = 0; j < items[i].elements.length; j++) {

          var currentOption = items[i].elements[j];
          var propertyName  = null;
          var propertyValue = null;
          var type          = null;

          //Сначала попытаемся определить propertyName:
          //propertyName - название свойства модели, которое будет связано с элементом формы
          //определить его можно. если оно либо явно указано в элементе, в противном случае на основе label можно попробовать сгенерить
          propertyName = this._tryGetPropertyName(currentOption);

          //теперь, если свойство propertyName есть -> пытаемся сгенерить начальное значение для этого property на основе типа элемента
          if (propertyName && currentOption.element) {

            var element = currentOption.element;

            type = this._tryGetType(currentOption);
            switch (type) {
              case "textfield":
              case "textarea" :
                //если есть пользовательское значение - устанавливаем его, иначе значение по умолчанию - null
                if (element.value !== undefined) {
                  //для textfield, если значение число - преобразуем его в строку
                  if (typeof element.value == "number") {
                     element.value += '';
                  }
                  //не позволим присвоить неправильное значение, например объект, присвоить можно только строку (либо число, преобразованное к строке ранее)
                  if (typeof element.value == "string") {
                    propertyValue = element.value;
                  }
                }
                if (!this._inArray(propertyName, modelProperties)) {
                  modelSkeleton[propertyName] = propertyValue;
                  modelProperties.push(propertyName);
                }
                break;
              case "range":
                propertyValue = ["0", "0"];
                if (this._isArray(element.data)) {
                  var from = (element.data[0]) ? element.data[0] : 0;
                  var to   = (element.data[1]) ? element.data[1] : 0;
                  from     = (typeof from == "number") ? from + "" : from;
                  to       = (typeof to   == "number") ? to   + "" : to;
                  if (typeof from == "string") {
                    propertyValue[0] = from;
                  } else {
                    propertyValue[0] = "0";
                  }
                  if (typeof to == "string") {
                    propertyValue[1] = to;
                  } else {
                    propertyValue[1] = "0";
                  }
                }
                if (!this._inArray(propertyName, modelProperties)) {
                  modelSkeleton[propertyName] = propertyValue;
                  modelProperties.push(propertyName);
                }
                break;
              case "radiobuttongroup":
              case "select"          :
              case "singlelist"      :
                if (this._isArray(element.data)) {
                  if ((element.value != undefined) && this._inArray(element.value, element.data, "value", "label")) {
                    propertyValue = element.value;
                  } else {
                    //по умолчанию первый из списка
                    //не null и не undefined
                    if (element.data[0].value != undefined) {
                      propertyValue = element.data[0].value;
                    }
                    else if (element.data[0].label) {
                      propertyValue = element.data[0].label;
                    }
                    else {
                      propertyValue = element.data[0];
                    }
                  }
                  if (!this._inArray(propertyName, modelProperties)) {
                    modelSkeleton[propertyName] = propertyValue;
                    modelProperties.push(propertyName);
                  }
                }
                break;
              case "multilist":
                if (this._isArray(element.data)) {
                  propertyValue = null;
                  //"Грязный код" :(
                  //тупо в лоб назначили свойство null, а установим его на этапе создания multiple list, уже после биндинга через setSelection
                  if (!this._inArray(propertyName, modelProperties)) {
                    modelSkeleton[propertyName] = propertyValue;
                    modelProperties.push(propertyName);
                  }
                }
                break;
              case "checkbox":
                if (element.value) //true , "true", 1 - сработают, правда и {} тоже отметит чекбокс
                {
                  propertyValue = 1;
                } else {
                  propertyValue = 0;
                }
                if (!this._inArray(propertyName, modelProperties)) {
                  modelSkeleton[propertyName] = propertyValue;
                  modelProperties.push(propertyName);
                }
                break;
              case "checkboxgroup":
                if (this._isArray(element.data)) {
                  propertyValue = [];
                  for (var k = 0; k < element.data.length; k++) {
                    if (element.data[k]) {
                      if (element.data[k].value != undefined) {
                        propertyValue.push(+!!element.data[k].value);
                      } else {
                        propertyValue.push(1);
                      }
                    }
                    else {
                      propertyValue.push(0);
                    }
                  }
                  if (!this._inArray(propertyName, modelProperties)) {
                    modelSkeleton[propertyName] = propertyValue;
                    modelProperties.push(propertyName);
                  }
                }
                break;
            }
          }
        }
      }
      console.log(modelSkeleton);
      this._model = qx.data.marshal.Json.createModel(modelSkeleton);
      this._controller = new qx.data.controller.Object(this._model);
    },
    _createFormItems: function(options) {
      //инициализируем валидатор
      this._manager = new qx.ui.form.validation.Manager();

      var items = options.items;
      //добавляем дочерние виджеты
      for (var i = 0; i < items.length; i++) {
        //нам нужно установить менеджер раскладки, и иметь публичные методы для управления дочерними виджетами
        //поэтому будем использовать Composite вместо обычного виджета
        var child = new qx.ui.container.Composite();
        child.setLayout(new qx.ui.layout.Grid(15, 15));
        this._add(child, {row: 0, column: i});

        //теперь, после того, как добавили колонку, начнем её заполнять
        var row = 0;

        //если есть заголовок, создадим его
        if (items[i].name) {
          var mainLabel = new qx.ui.basic.Label().set({
            value: "<b>" + items[i].name + "</b>",
            rich: true
          });
          child.add(mainLabel, {row: row, column: 0})
          row++;
        }

        for (var j = 0; j < items[i].elements.length; j++) {
          var currentOption = items[i].elements[j];
          //Пробуем добавить label
          //позиция label top, (если есть)
          var topPosition   = currentOption.label && currentOption.label.position && currentOption.label.position == "top";
          var labelName     = null;
          //если есть label в свойствах
          if (currentOption.label) {
            //указан ли label через объект, или нет, пустую строку не считаем
            if (currentOption.label.name && typeof currentOption.label.name == "string") {
              labelName = currentOption.label.name;
            } else if (typeof currentOption.label == "string") {
              labelName = currentOption.label;
            }
            //если есть имя для label, создаем его
            if (labelName != null) {
              var label   = new qx.ui.basic.Label(labelName);
              //если есть option, установим их для label
              if (currentOption.label.options) {
                label.set(currentOption.label.options);
              }
              child.add(label, {row: row, column: 0});
              //если label над элементом
              if (topPosition) {
                row++;
              }
            }
          }

          //если есть свойство element  попробуем добавить элемент
          if (currentOption.element) {
            //если есть имя label или указан propertyName, то создаем элемент
            if (labelName != null || currentOption.element.propertyName) {
              //Внутри ф-ции создания элемента делается binding с моделью (если, конечно элемент создастся) , если получается создать элемент
              var element = this._createElement(currentOption);

              //если все хорошо добавляем элемент
              if (element != null) {
                if (topPosition) {
                  child.add(element, {row: row, column: 0});
                }
                else {
                  child.add(element, {row: row, column: 1});
                }
              }
            }
          }
          row++;
        }
      }
    },
    _inArray: function (needle, haystack, property, secondProperty, strict) {
      var found = false, key, strict = !!strict;
        for (key in haystack) {
          var item = haystack[key];
          if (property && item[property] !== undefined) {
            item = item[property];
          } else if (secondProperty && item[secondProperty] !== undefined) {
            item = item[secondProperty];
          }
          if ((strict && item === needle) || (!strict && item == needle)) {
            found = true;
            break;
          }
        }
        return found;
    },
    //просто расширение свойств объекта свойствами другого объекта
    //копируем, если только оба свойства объектов строки или объекты
    _copy: function(dst, obj) {
      for (property in obj) {
        if (dst[property]) {
          //если оба свойства - объекты, рекурсивно копируем их
          if (typeof dst[property] == "object" && typeof obj[property] == "object") {
            this._copy(dst[property], obj[property]);
          }
          //иначе, если оба свойства элементарные значения и obj[property] != undefined, просто копируем их
          else if (obj[property] != undefined && typeof dst[property] != "function" && typeof dst[property] != "object" && typeof obj[property] != "function" && typeof obj[property] != "object") {
            dst[property] = obj[property];
          }
        }
      }
    },
    _isArray: function(data) {
      var toClass = {}.toString;
      if (data && toClass.call(data) == "[object Array]" && data.length) {
        //предварительно очистим массив от null и undefined
        var i = data.length - 1;
        while(i != -1) {
          if (data[i] == undefined) {
            data.splice(i, 1);
          }
          i--;
        }
        return data.length;
      }
      return false;
    },
    _createButtons: function(options) {
      var buttons = options.buttons;
      //Добавим кнопки
      if (buttons.length) {
        child = new qx.ui.container.Composite(new qx.ui.layout.HBox(5));
        for (var i = 0; i < buttons.length; i++) {
          var button = new qx.ui.form.Button(buttons[i].text);
          if (buttons[i].options) {
            button.set(buttons[i].options);
          }
          button.addListener("execute", buttons[i].callback, this);
          child.add(button);
        }
        this._add(child, {row: 1, column: 0, colSpan: 2});
      }
    },
    _createElement: function(currentOption) {
      var propertyName = null;
      var type         = null;
      var element      = null;
      //пытаемся определить propertyName и type
      propertyName = this._tryGetPropertyName(currentOption);
      type         = this._tryGetType(currentOption);
      //создание элемента и биндинг не произойдет, если уже был создан элемент с таким же свойством (propertyName)
      switch (type) {
        case "textfield":
          if (!this._inArray(propertyName, this._modelProperties)) {
            element = this._createTextField(currentOption.element.options);
            //binding с контроллером:
            this._controller.addTarget(element, "value", propertyName, true);
            this._modelProperties.push(propertyName);
            //валидация
            this._standartValidate(element, currentOption);
          }
          break;
        case "textarea":
          if (!this._inArray(propertyName, this._modelProperties)) {
            element = this._createTextArea(currentOption.element.options);
            //binding с контроллером:
            this._controller.addTarget(element, "value", propertyName, true);
            this._modelProperties.push(propertyName);
            //валидация
            this._standartValidate(element, currentOption);
          }
          break;
        case "range":
          if (!this._inArray(propertyName, this._modelProperties)) {
            element = this._createRange();
            //конвертеры, первый необязателен,т.к. не конвертирует ничего :), но оставлю
            var model2Textfield = {converter: function(data) {
              return data;
            }};
            var textfield2Model = {converter: function(data) {
              var data = parseInt(data, 10);
              data += "";
              if (data) {
                return data;
              }
              else {
                return "0";
              }
            }};

            var textfieldFirst = this._createTextField(currentOption.element.options);
            element.add(textfieldFirst);
            //binding с контроллером:
            this._controller.addTarget(textfieldFirst, "value", propertyName + "[0]", true, model2Textfield, textfield2Model);

            textfieldSecond = this._createTextField(currentOption.element.options);
            element.add(textfieldSecond);
            //binding с контроллером:
            this._controller.addTarget(textfieldSecond, "value", propertyName + "[1]", true, model2Textfield, textfield2Model);

            this._modelProperties.push(propertyName);
            //валидация
            this._rangeValidate(element, textfieldFirst, textfieldSecond, currentOption);
          }
          break;
        case "radiobuttongroup" :
        case "select"           :
        case "singlelist"       :
          if (!this._inArray(propertyName, this._modelProperties)) {
            //проведем проверку, что currentOption.data, если существует - то это массив
            if (this._isArray(currentOption.element.data)) {
              element = this._createSelectionElement(currentOption.element.data, currentOption.element.options, type);
              //биндинг
              this._controller.addTarget(element, "modelSelection[0]", propertyName, true);
              this._modelProperties.push(propertyName);
              //валидация ниже
              this._selectValidate(element, currentOption);
            }
          }
          break;
        //в принципе, можно добавить в case выше, но не обязательно
        case "multilist":
          if (!this._inArray(propertyName, this._modelProperties)) {
            if (this._isArray(currentOption.element.data)) {

              element = this._createSelectionElement(currentOption.element.data, currentOption.element.options, type);

              //!! здесь биндинг !!
              this._controller.addTarget(element, "modelSelection", propertyName ,true);
              this._modelProperties.push(propertyName);

              if (element.getUserData("itemsArray").length) {
                element.setSelection(element.getUserData("itemsArray"));
              } else {
                element.setSelection([element.getUserData("firstItem")]);
              }
              //валидация ниже
              this._selectValidate(element, currentOption);
            }
          }
          break;
        case "checkbox":
          if (!this._inArray(propertyName, this._modelProperties)) {
            element = this._createCheckbox(currentOption.element.label);
            var model2CheckBox = {converter: function(data) {
              return data === 1;
            }}
            var checkBox2Model = {converter: function(data) {
              return data ? 1 : 0;
            }}
            this._controller.addTarget(element, "value", propertyName, true, model2CheckBox, checkBox2Model);
            this._modelProperties.push(propertyName);

            //валидация
            this._standartValidate(element, currentOption);
          }
          break;
        case "checkboxgroup":
          if (!this._inArray(propertyName, this._modelProperties)) {
            if (this._isArray(currentOption.element.data)) {
              element = this._createCheckboxGroup(currentOption.element.options);
              element.setLayout(new qx.ui.layout.VBox(10));
              for (var i = 0; i < currentOption.element.data.length; i++) {
                var checkbox = this._createCheckbox(currentOption.element.data[i].label);
                element.add(checkbox);
                var model2CheckBox = {converter: function(data) {
                  return data === 1;
                }}
                var checkBox2Model = {converter: function(data) {
                  return data ? 1 : 0;
                }}
                this._controller.addTarget(checkbox, "value", propertyName + "[" + i + "]", true, model2CheckBox, checkBox2Model);
              }
              this._modelProperties.push(propertyName);
              this._checkboxGroupValidate(element, currentOption);

            }
          }
          break;
        default:
          //если не получилось определить тип - возвращаем пусто
          element = null;
          break;
      }
      return element;
    },
    //стандартная валидация (для элементов: textfield, textarea, checkbox)
    _standartValidate: function(element, currentOption) {
      //Здесь блок валидации идет:
      if (currentOption.element.validate && currentOption.element.validate.funct) {
        var validate = null;
        //если свой валидатор:
        if (typeof currentOption.element.validate.funct == "function") {
          validate = currentOption.element.validate.funct;
          this._manager.add(element, validate);
        }
        //иначе пробуем подобрать валидатор из готового набора
        else if (typeof currentOption.element.validate.funct == "string") {
          validate = this._tryComputeValidator(currentOption.element.validate);
          if (validate) {
            if (validate == "required") {
              element.setRequired(true);
              this._manager.add(element);
            } else {
              this._manager.add(element, validate);
            }
          }
        }
      }
      //конец блока валидации
    },
    //валидатор для группы чекбоксов
    _checkboxGroupValidate: function(element, currentOption) {
      //Здесь блок валидации идет, позволен только пользовательский валидатор , element - это checkbox group
      if (currentOption.element.validate && currentOption.element.validate.funct) {
        var checkboxes = element.getChildren();
        //копим валидаторы
        this._validateArray.push(currentOption.element.validate.funct.bind(this, element, checkboxes));
      }
    },
    //используется для валидации select/single-multiple list
    _selectValidate: function(element, currentOption) {
      if (currentOption.element.validate && currentOption.element.validate.funct) {
        //копим валидаторы
        this._validateArray.push(currentOption.element.validate.funct.bind(this, element));
      }
    },
    //для валидации диапазона
    _rangeValidate: function(element, first, second, currentOption) {
      if (currentOption.element.validate && currentOption.element.validate.funct) {
        //копим валидаторы
        this._validateArray.push(currentOption.element.validate.funct.bind(this, element, first, second));
      }
    },
    _createTextField: function(options) {
      if (options) {
        return new qx.ui.form.TextField().set(options);
      }
      return new qx.ui.form.TextField();
    },
    _createTextArea:  function(options) {
      if (options) {
        return new qx.ui.form.TextArea.set(options);
      }
      return new qx.ui.form.TextArea();
    },
    _createCheckbox: function(label) {
      return new qx.ui.form.CheckBox(label);
    },
    _createCheckboxGroup: function(options) {
      if (options) {
        return new qx.ui.groupbox.GroupBox().set(options);
      }
      return new qx.ui.groupbox.GroupBox();
    },
    _createRange: function() {
      return new qx.ui.container.Composite(new qx.ui.layout.HBox(5));
    },
    _createSelectionElement: function(data, options, type) {
      var element = null;
      switch (type) {
        case "radiobuttongroup":
          element = new qx.ui.form.RadioButtonGroup();
          break;
        case "select":
          element = new qx.ui.form.SelectBox();
          break;
        case "singlelist":
          element = new qx.ui.form.List();
          element.set({selectionMode : "single"});
          break;
        case "multilist":
          //var itemsArray = [];
          element = new qx.ui.form.List();
          element.set({selectionMode : "multi"});
          element.setUserData("itemsArray", []);
          break;
      }

      for (var i = 0; i < data.length; i++) {
        var value = null;
        if (data[i].value != undefined) {
          value = data[i].value;
        } else if (data[i].label) {
          value = data[i].label;
        } else {
          value = data[i];
        }
        var label = null;
        if (data[i].label) {
          label = data[i].label;
        } else if (data[i].value != undefined) {
          label = data[i].value;
        } else {
          label = data[i];
        }

        label += '';
        switch (type) {
          case "radiobuttongroup" :
            var radioButton = new qx.ui.form.RadioButton(label);
            radioButton.setModel(value);
            element.add(radioButton);
            break;
          case "select"          :
          case "singlelist"      :
            element.add(new qx.ui.form.ListItem(label, null, value));
            break;
          case "multilist"       :
            var listItem = new qx.ui.form.ListItem(label, null, value);
            if (!i) {
              element.setUserData("firstItem", listItem);
            }
            element.add(listItem);
            if (data[i].set) {
              element.getUserData("itemsArray").push(listItem);
            }
        }
      }
      return element;
    },
    //метод пытается получить свойство name для элемента
    _tryGetPropertyName: function(currentOption) {
      var propertyName = null;
      //если есть propertyName, устанавливаем его в макет будущей модели
      if (currentOption.element && currentOption.element.propertyName && typeof currentOption.element.propertyName == "string") {
        propertyName = currentOption.element.propertyName;
        //обрежем теги и пробелы, если в свойство их зачем-то записали:
        propertyName = propertyName.replace(/<\/?[^>]+>|\s/g,'');
      }
      //иначе пытаемся сгенерить на основе label
      else if (currentOption.label) {
        if (currentOption.label.name && typeof currentOption.label.name == "string") {
          propertyName = currentOption.label.name;
          propertyName = propertyName.replace(/<\/?[^>]+>|\s/g,'');
        } else if (typeof currentOption.label == "string") {
          propertyName = currentOption.label;
          propertyName = propertyName.replace(/<\/?[^>]+>|\s/g,'');
        }
      }
      return propertyName;
    },
    //метод пытается получить свойство type для элемента
    _tryGetType: function(currentOption) {
      var type = null;
      if (currentOption.element) {
        //определим тип элемента, пытаемся определить тип элемента
        if (currentOption.element.type && typeof currentOption.element.type == "string") {
          type = currentOption.element.type;
        }
        else {
          if (typeof currentOption.element == "string") {
            type = currentOption.element;
          }
        }
      }
      return type;
    },
    _tryComputeValidator: function(validator) {
      var funct = validator.funct;
      var args  = null;
      var errorMessage = null;
      //если есть доп. аргументы
      if (validator.args) {
        args = validator.args;
      }
      //если есть сообщение о ошибке
      if (validator.errorMessage) {
        errorMessage = validator.errorMessage;
      }
      //т.к. return, break не нужен
      switch(funct) {
        case "required":
          return "required";
        case "number"  :
          return qx.util.Validate.number(errorMessage);
        case "email"   :
          return qx.util.Validate.email(errorMessage);
        case "string"  :
          return qx.util.Validate.string(errorMessage);
        case "url"     :
          return qx.util.Validate.url(errorMessage);
        case "color"   :
          return qx.util.Validate.color(errorMessage);
        case "range"   :
          if (args[0] && args[1]) {
            return qx.util.Validate.range(args[0], args[1], errorMessage);
          }
          return null;
        case "inArray":
          if (args) {
            return qx.util.Validate.inArray(args, errorMessage);
          }
          return null;
        case "regExp":
          if (args) {
            return qx.util.Validate.regExp(args, errorMessage);
          }
          return null;
        default:
          return null;
      }
    }
  }
});