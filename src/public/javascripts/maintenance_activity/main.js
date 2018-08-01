function setDefaultDropDownListOption(containerName) {
  var container = $('select#'.concat(containerName));
  var option = '';

  container.empty();
  
  if (container.prop('multiple') === false) {
    option = option.concat('<option>Seleccione</option>');
  }

  container.append(option);

  return false;
}

function setDropDownListOptions(actionName, parameter, containerName) {
  var action = ''.concat(actionName ,'/', parameter);
  var container = $('select#'.concat(containerName)); 

  container.empty();
  
  $.get(action, function (response) {
    var options = '';
    
    if (container.prop('multiple') === false) {
      options = options.concat('<option>Seleccione</option>');
    }

    _.each(response.data, function (item, i) {
      options = options.concat('<option value="', item._id, '">', item.name, '</option>');
    });

    container.append(options);

    return false;
  });

  return false;
}

function searchMaintenanceActivity(identifier) {
  var action = ''.concat('/maintenanceActivities/', identifier);
  
  $.get(action)
  .done(function (response) {
    $('#updateMaintenanceActivityModal input#maintenanceActivity').val(response.data._id);
    $('#updateMaintenanceActivityModal input#name').val(response.data.name);
    $('#updateMaintenanceActivityModal textarea#description').text(response.data.description ? response.data.description : '');
    
    if ($('#updateMaintenanceActivityModal select#company').length > 0) {
      $('#updateMaintenanceActivityModal select#company').val(response.data.company._id).trigger('change');
    
      var interval = setInterval(function () {
        if ($('#updateMaintenanceActivityModal select#equipmentType :selected').val() !== 'Seleccione') {
          clearInterval(interval);
        }
        if ($('#updateMaintenanceActivityModal select#equipmentType option').length > 1) {
          $('#updateMaintenanceActivityModal select#equipmentType').val(response.data.equipmentType._id);
        }
      
        return false;
      }, 250);
    }
    else {
      $('#updateMaintenanceActivityModal input#equipmentType').val(response.data.equipmentType.name);
    }

    $('#updateMaintenanceActivityModal input[type=checkbox]#status').prop('checked', response.data.status).trigger('change');
        
    $('#updateMaintenanceActivityModal').modal('show');
    
    return false;
  })
  .fail(function (xhr, status, error) {
    var response = xhr.responseJSON;
    
    console.log(JSON.stringify(response));
    
    return false;
  });

  return false;
}

function updateMaintenanceActivity(action, data, onSuccess, onFailure) {
  $.ajax({
    url: action,
    method: 'PUT',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify(data),
    success: onSuccess,
    error: onFailure
  });
    
  return false;
}

function deleteMaintenanceActivity(identifier) {
  var action = ''.concat('/maintenanceActivities/', identifier);
  var data = {status: false, deleted: true};
  var onSuccess = function (response) {
    window.location.reload(true);
    
    return false;
  };
  var onFailure = function (xhr, status, error) {
    var response = xhr.responseJSON;
    
    console.log(JSON.stringify(response));
    
    return false;
  };

  updateMaintenanceActivity(action, data, onSuccess, onFailure);

  return false;
}

function restoreMaintenanceActivity(identifier) {
  var action = ''.concat('/maintenanceActivities/', identifier);
  var data = {status: true, deleted: false};
  var onSuccess = function (response) {
    window.location.reload(true);
    
    return false;
  };
  var onFailure = function (xhr, status, error) {
    var response = xhr.responseJSON;
    
    console.log(JSON.stringify(response));
    
    return false;
  };

  updateMaintenanceActivity(action, data, onSuccess, onFailure);

  return false;
}

$(document).ready(function () {
  var multidateSeparator = ' | ';
  var dateFormat = 'dd/mm/yyyy';

  $('.input-group.date').datepicker({
    format: dateFormat,
    weekStart: 7,
    startDate: 'today',
    clearBtn: true,
    language: 'es',
    orientation: 'auto left',
    multidate: true,
    multidateSeparator: multidateSeparator,
    daysOfWeekDisabled: '0,6',
    daysOfWeekHighlighted: '0,6',
    todayHighlight: true,
    toggleActive: true,
    templates: {
      leftArrow: '<i class="fa fa-angle-double-left"></i>',
      rightArrow: '<i class="fa fa-angle-double-right"></i>'
    }
  });

  $('#manageActivity, #manageActivityAttention').click(function (e) {
    if (/^manageActivity$/.test($(this).attr('id'))) {
      $($('#tabManageActivityModal a')[0]).click();
    }
    else if (/^manageActivityAttention$/.test($(this).attr('id'))) {
      $($('#tabManageActivityModal a')[1]).click();
    }
    $('#manageActivityModal').modal('show');

    return false;
  });

  $('#addMaintenanceActivityName').click(function (e) {
    var index = $('.form-group input[name^="name"]').length;
    var newRow = ''.concat(
      '<div class="form-group row added">',
        '<label class="col-3 col-form-label" for="name', index, '">Nombre</label>',
        '<div class="col-9">',
          '<input id="name', index ,'" name="name', index, '" type="text" class="form-control" placeholder="Nombre">',
        '</div>',
      '</div>');

    var container = $(this).parent().prev();
    
    container.after(newRow);

    return false;
  });

  $('#removeMaintenanceActivityName').click(function (e) {
    var container = $(this).parent().prev();

    if (container.hasClass('added') === true) {
      container.remove();
    }

    return false;
  });

  $('select#company').change(function (e) {
    e.preventDefault();

    var companyId = $(this).find('option:selected').val();

    if (companyId === 'Seleccione') {
        setDefaultDropDownListOption('equipmentType');
        setDefaultDropDownListOption('maintenanceActivities');
        setDefaultDropDownListOption('equipment');
    }
    else {
      setDropDownListOptions('/equipmentTypes/company', companyId, 'equipmentType');
    }

    return false;
  });

  $('select#equipmentType').change(function (e) {
    e.preventDefault();
    
    var equipmentTypeId = $(this).find('option:selected').val();

    if (equipmentTypeId === 'Seleccione') {
      setDefaultDropDownListOption('maintenanceActivities');
      setDefaultDropDownListOption('equipment');
    }
    else {
      setDropDownListOptions('/maintenanceActivities/equipmentType', equipmentTypeId, 'maintenanceActivities');
      setDropDownListOptions('/equipments/equipmentType', equipmentTypeId, 'equipment');
    }

    return false;
  });

  $('input[type=checkbox]#status').change(function (e) {
    e.preventDefault();

    $('input#statusValue').val($(this).prop('checked') ? 'Activo' : 'Inactivo');
    
    return false;
  });

  $('#addMaintenanceActivitySubmit').click(function (e) {
    e.preventDefault();

    // Removes all required input warnings on modal
    $(document).find('[name="requireFieldMessage"]').remove();

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};
    var collection = [];
    var complementaryInfo = {};

    _.each(form, function (item) {
      var control = $(item);				
      
      if (control.attr('class').indexOf('form-control') > -1 || control.attr('type') === 'hidden') {
        if (control.prop('tagName').toLowerCase() === 'input') {
          if (control.val().trim().length > 0) {
            if (item.getAttribute("type") === "email"){
              if (!(/^[a-zA-Z0-9]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)) {
                $(item).after('<p style="color:red;" name="description">Correo inválido</p>');
                return;
              }
            }
            if (item.getAttribute("type") === "phone") {              
              if (!(/^[0-9]+$/ig).exec(item.value)) {
                $(item).after('<p style="color:red;" name="description">Campo debe ser numérico</p>');
                return;
              }
            }
            if (/name\d*/.test(control.attr('name')) === true) {
              collection.push({name: control.val().trim()});
            }
            else {
              complementaryInfo[control.attr('name')] = control.val().trim();
            }
          }
          else {
            control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
          }
        }
        else if (control.prop('tagName').toLowerCase() === 'select') {
          var itemValue = control.find('option:selected').attr('value');							

          if (itemValue !== undefined) {
            complementaryInfo[control.attr('name')] = itemValue;
          }
          else {
            control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
          }
        }
      }
    });

    collection = _.map(collection, function (item) {
      item = _.reduce(Object.keys(complementaryInfo), function (accumulator, key) {
        accumulator[key] = complementaryInfo[key];
        return accumulator;
      }, item);
      return item;
    });

    // Validates if there are not required input warnings on modal to make the request
    if ($(form).find('[name="requireFieldMessage"]').length === 0) {					
      var action = $($(this).parents('form')).attr('action');

      data['documents'] = JSON.stringify(collection);

      $.post(action, data)
      .done(function (response) {		
        $('#manageActivityModal').modal('hide');
        
        window.location.reload(true);
        
        return false;
      })
      .fail(function (xhr, status, error) {
        var response = xhr.responseJSON;
        var maintenanceActivityNames = $('.form-group input[name^="name"]');

        $(document).find('[name="requireFieldMessage"]').remove();
        
        _.each(maintenanceActivityNames, function(maintenanceActivityName, index) {
          if (response.results[index] === true) {
            $(maintenanceActivityName).after('<p style="color:red;" name="requireFieldMessage">La actividad ya existe</p>');
          }
        });

        return false;
      });
    }

    return false;
  });

  $('#addMaintenanceActivityAttentionSubmit').click(function (e) {
    e.preventDefault();

    // Removes all required input warnings on modal
    $(document).find('[name="requireFieldMessage"]').remove();

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};
    var collection = [];
    var complementaryInfo = {};
    var dates = [];

    _.each(form, function (item) {
      var control = $(item);
      
      if (control.attr('class').indexOf('form-control') > -1 || control.attr('type') === 'hidden') {
        if (control.prop('tagName').toLowerCase() === 'input') {
          if (control.val().trim().length > 0) {
            if (control.attr('name').indexOf('dates') > -1) {
              complementaryInfo[control.attr('name')] = control.val().split(multidateSeparator);
            }
            else {
              complementaryInfo[control.attr('name')] = control.val().trim();
            }
          }
          else {
            if (control.parent().attr('class').indexOf('input-group') > -1) {
              control.parent().after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
            }
            else {
              control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
            }
          }
        }
        else if (control.prop('tagName').toLowerCase() === 'select') {
          var itemValues = control.find('option:selected');							

          if (control.attr('name').indexOf('maintenanceActivities') > -1) {
            itemValues = _.reduce(itemValues, function (accumulator, itemValue) {
              accumulator.push($(itemValue).attr('value'));
              return accumulator;
            }, []);
          }
          else {
            itemValues = itemValues.attr('value');
          }

          if (typeof itemValues !== 'undefined' && itemValues.length > 0) {
            complementaryInfo[control.attr('name')] = itemValues;
          }
          else {
            control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
          }
        }
      }
    });

    collection = _.reduce(complementaryInfo.dates, function (accumulator, date) {
      var document = {};
      console.log(complementaryInfo.maintenanceActivities)
      document['date'] = moment(date, dateFormat.toUpperCase()).valueOf();
      document['maintenanceActivityAttentions'] = _.reduce(complementaryInfo.maintenanceActivities, function (accumulator, maintenanceActivity) {
        var maintenanceActivityAttention = {
          maintenanceActivity: maintenanceActivity,
          equipment: complementaryInfo.equipment,
          date: moment(date, dateFormat.toUpperCase()).valueOf()
        }
        accumulator.push(maintenanceActivityAttention);
        return accumulator;
      }, []);

      accumulator.push(document);
      return accumulator;
    }, []);

    // Validates if there are not required input warnings on modal to make the request
    if ($(form).find('[name="requireFieldMessage"]').length === 0) {					
      var action = $($(this).parents('form')).attr('action');

      data['equipment'] = complementaryInfo.equipment;
      data['documents'] = JSON.stringify(collection);

      $.post(action, data)
      .done(function (response) {
        $('#manageActivityModal').modal('hide');
        
        window.location.reload(true);
        
        return false;
      })
      .fail(function (xhr, status, error) {
        var response = xhr.responseJSON;
        
        console.log(JSON.stringify(response));
        
        return false;
      });
    }
  });

  $('#updateMaintenanceActivitySubmit').click(function (e) {
    e.preventDefault();
    
    var form = document[$($(this).parents('form')).attr('name')];
    var action = $($(this).parents('form')).attr('action').concat('/', $(form).find('input[type=hidden]').val());
    var data = {};
    var onSuccess = function (response) {
      $('#updateMaintenanceActivityModal').modal('hide');
      
      window.location.reload(true);
      
      return false;
    };
    var onFailure = function (xhr, status, error)  {
      var response = xhr.responseJSON;
      
      console.log(JSON.stringify(response));
      
      return false;
    };

    _.each(form, function (item) {
      var control = $(item);

      if (control.attr('class').indexOf('form-control') > -1 || control.attr('class').indexOf('form-control-custom') > -1 || control.attr('type') === 'hidden') {
        if (control.prop('tagName').toLowerCase() === 'input' || control.prop('tagName').toLowerCase() === 'textarea') {
          if (control.attr('type') === 'checkbox') {
            data[control.attr('name')] = control.prop('checked');
          }
          else if (control.val().trim().length > 0) {
            data[control.attr('name')] = control.val().trim();
          }
        }
        else if (control.prop('tagName').toLowerCase() === 'select') {
          var itemValue = control.find('option:selected').attr('value');							

          if (itemValue !== undefined) {
            data[control.attr('name')] = itemValue;
          }
        }
      }
    });

    updateMaintenanceActivity(action, data, onSuccess, onFailure);

    return false;
  });

  $(document).on('click', '.searchMaintenanceActivity, .deleteMaintenanceActivity', function(e){
    e.preventDefault();
    var _id = this.getAttribute('data-id');
    if($(this).hasClass('searchMaintenanceActivity')){
      searchMaintenanceActivity(_id);
    }else{
      deleteMaintenanceActivity(_id);
    }
  });

  $('#maintenanceActivitySearchButtom, #maintenanceActivityAttentionSearchButtom').click(function(e){
    e.preventDefault();
    var type= $(this).attr('data-type'), 
        selector=type=='maintenanceActivities'?'table-maintenanceActivity':'table-maintenanceActivityAttention', 
        searchImput = $('#'.concat(type=='maintenanceActivities'?'maintenanceActivitySearchInput':'maintenanceActivityAttentionSearchInput')).val(), 
        url='', rows='';

      url='/'.concat(type, '/0/1000/', searchImput.length?searchImput:'all');
      
      $.get(url, function(data){
                
        if(!data.error){

          if(type=='maintenanceActivities'){
            _.each(data.data, function(value, key){
              rows=rows.concat(
                '<tr><td>',key+1, '</td>',
                '<td>', value.name, '</td>',
                '<td>', value.company.name, '</td>',
                '<td>', value.equipmentType.name, '</td>',
                '<td>', value.status ? 'Activo': 'Inactivo', '</td>',
                '<td><a class="btn default btn-xs blue-stripe searchMaintenanceActivity" data-id="',value._id,'">Editar</a></td>',
                '<td><i class="fa fa-trash deleteMaintenanceActivity" data-id="',value._id,'" aria-hidden="true"></i></td></tr>')
            });
          }else{
            _.each(data.data, function(value, key){
              rows=rows.concat(
                '<tr><td>',key+1, '</td>',
                '<td>', value.maintenanceActivity.name, '</td>',
                '<td>', value.equipment.name, '</td>',
                '<td>', value.ckecked ? 'Activo': 'Inactivo', '</td>',
                '<td>', moment(value.date.toString()).format("DD/MM/YY"), '</td>')
            });
          }
          $('.'.concat(selector, ' tbody')).empty();
          $('.'.concat(selector, ' tbody')).html(rows);
        }
      });

  });

});