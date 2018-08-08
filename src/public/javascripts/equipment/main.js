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

function searchEquipmentType(identifier) {
  var action = ''.concat('/equipmentTypes/', identifier);
  
  $.get(action)
  .done(function (response) {
    $('#updateEquipmentTypeModal input#equipmentType').val(response.data._id);
    $('#updateEquipmentTypeModal input#name').val(response.data.name);
    $('#updateEquipmentTypeModal textarea#description').text(response.data.description ? response.data.description : '');
    
    if ($('#updateEquipmentTypeModal select#company').length > 0) {
      $('#updateEquipmentTypeModal select#company').val(response.data.company._id).trigger('change');
    }

    $('#updateEquipmentTypeModal input[type=checkbox]#status').prop('checked', response.data.status).trigger('change');
        
    $('#updateEquipmentTypeModal').modal('show');
    
    return false;
  })
  .fail(function (xhr, status, error) {
    var response = xhr.responseJSON;
    
    console.log(JSON.stringify(response));
    
    return false;
  });
}

function updateRequest(action, data, onSuccess, onFailure) {
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

function deleteEquipmentType(identifier) {
  var action = ''.concat('/equipmentTypes/', identifier);
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

  updateRequest(action, data, onSuccess, onFailure);

  return false;
}

function restoreEquipmentType(identifier) {
  var action = ''.concat('/equipmentTypes/', identifier);
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

  updateRequest(action, data, onSuccess, onFailure);

  return false;
}

function searchNextMaintenanceActivityAttention(identifier) {
  var action = ''.concat('/maintenanceActivityAttentions/', identifier, '/next');
  
  $.get(action)
  .done(function (response) {
    console.log(response)

    $('#updateMaintenanceActivityAttentionModal span#date').text(response.data.date);
    $('#updateMaintenanceActivityAttentionGroup input#maintenanceActivityDate').val(response.data.maintenanceActivityDate);

    if (response.data.enableStart === true) {
      $('#updateMaintenanceActivityAttentionGroup span#notStarted').show();
      $('#updateMaintenanceActivityAttentionGroup button#startAttentionSubmit').show();
    }
    else if (response.data.enableFinish === true) {
      $('#updateMaintenanceActivityAttentionGroup span#inProgress').show();
      $('#updateMaintenanceActivityAttentionGroup button#finishAttentionSubmit').show();
      $('#updateMaintenanceActivityAttention button#updateMaintenanceActivityAttentionSubmit').show();
      $('#updateMaintenanceActivityAttention div#commentRow').show();
    }
    else if (response.data.started === false) {
      $('#updateMaintenanceActivityAttentionGroup span#toAttend').show();
    }
    else if (response.data.finished === true) {
      $('#updateMaintenanceActivityAttentionGroup span#finished').show();
      $('#updateMaintenanceActivityAttention div#commentRow').show();
      $('#updateMaintenanceActivityAttention textarea#comment').attr('disabled', true);
    }

    $('#updateMaintenanceActivityAttention .form-group').remove();

    var html = _.reduce(
      response.data.maintenanceActivityAttentions, 
      function (accumulator, maintenanceActivityAttention) {
        accumulator += 
          '<div class="form-group row">' +
            '<div class="col-12">' +
              '<div class="input-group">' +
                '<span class="input-group-addon">' +
                  '<input class="form-control-custom" type="checkbox" id="' + maintenanceActivityAttention._id + '" ' + (response.data.enableFinish === true ? '' : 'disabled') + ' />' +
                '</span>' +
                '<input class="form-control" style="z-index: 1 !important;" type="text" value="' + maintenanceActivityAttention.maintenanceActivity.name + '" disabled />' +
              '</div>' +
            '</div>' +
          '</div>';
        return accumulator;
      }, 
      "");

    $('#updateMaintenanceActivityAttention').prepend(html);

    _.each(response.data.maintenanceActivityAttentions, function (maintenanceActivityAttention) {
      if (maintenanceActivityAttention.checked == true) {
        $('#updateMaintenanceActivityAttention .form-group input#'.concat(maintenanceActivityAttention._id)).prop('checked', true);
      }
    });

    $('#updateMaintenanceActivityAttention input[type=checkbox]').change(function (e) {
      e.preventDefault();
  
      var value = true;

      if (typeof $(this).prop('changed') === 'undefined') {
        $(this).prop('changed', true);
      }
      else {
        value = $(this).prop('changed');

        $(this).prop('changed', !value);
      }
  
      return false;
    });
    
    $('#updateMaintenanceActivityAttentionModal').modal('show');

    return false;
  })
  .fail(function (xhr, status, error) {
    var response = xhr.responseJSON;
    
    $.notify('El equipo no posee mantenimientos por atender', 'warn');
    
    console.log(JSON.stringify(response));
    
    return false;
  });

  return false;
}

function searchMaintenanceActivityAttention(identifier) {
  var action = ''.concat('/maintenanceActivityAttentions/activityDate/', identifier);
  
  $.get(action)
  .done(function (response) {
    console.log(response)

    $('#maintenanceActivityAttentionModal span#date').text(response.data.date);
    $('#maintenanceActivityAttentionGroup input#maintenanceActivityDate').val(response.data.maintenanceActivityDate);

    if (response.data.finished === true) {
      $('#maintenanceActivityAttentionGroup span#finished').show();
    }
    else if (response.data.finished === false) {
      $('#maintenanceActivityAttentionGroup span#notFinished').show();
    }

    $('#maintenanceActivityAttention .form-group').remove();

    var html = _.reduce(
      response.data.maintenanceActivityAttentions, 
      function (accumulator, maintenanceActivityAttention) {
        accumulator += 
          '<div class="form-group row">' +
            '<div class="col-12">' +
              '<div class="input-group">' +
                '<span class="input-group-addon">' +
                  '<input class="form-control-custom" type="checkbox" id="' + maintenanceActivityAttention._id + '" ' + (response.data.enableFinish === true ? '' : 'disabled') + ' />' +
                '</span>' +
                '<input class="form-control" style="z-index: 1 !important;" type="text" value="' + maintenanceActivityAttention.maintenanceActivity.name + '" disabled />' +
              '</div>' +
            '</div>' +
          '</div>';
        return accumulator;
      }, 
      "");

    $('#maintenanceActivityAttention').prepend(html);

    _.each(response.data.maintenanceActivityAttentions, function (maintenanceActivityAttention) {
      if (maintenanceActivityAttention.checked == true) {
        $('#maintenanceActivityAttention .form-group input#'.concat(maintenanceActivityAttention._id)).prop('checked', true);
      }
    });

    $('#maintenanceActivityAttentionModal').modal('show');

    return false;
  })
  .fail(function (xhr, status, error) {
    var response = xhr.responseJSON;

    console.log(JSON.stringify(response));
    
    return false;
  });

  return false;
}

$(document).ready(function () {
  $('#tabEquipmentType a').click(function (e) {
    e.preventDefault();
    
    $(this).tab('show');

    return false;
  });

  $('#addEquipmentType').click(function (e) {
    $('#addEquipmentTypeModal').modal('show');

    return false;
  });

  $('#addEquipment').click(function (e) {
    $('#addEquipmentModal').modal('show');

    return false;
  });

  $('select#company').change(function (e) {
    e.preventDefault();

    var companyId = $(this).find('option:selected').val();

    if (companyId === 'Seleccione') {
      setDefaultDropDownListOption('branchCompany');
      setDefaultDropDownListOption('equipmentType');
      setDefaultDropDownListOption('account');
    }
    else {
      setDropDownListOptions('/entities/branchCompanies/company', companyId, 'branchCompany');
      setDropDownListOptions('/equipmentTypes/company', companyId, 'equipmentType');
    }
  
    return false;
  });

  $('select#branchCompany').change(function (e) {
    e.preventDefault();

    var branchCompanyId = $(this).find('option:selected').val();

    if (branchCompanyId === 'Seleccione') {
      setDefaultDropDownListOption('account');
    }
    else {
      setDropDownListOptions('/accounts/technicians/branchCompany', branchCompanyId, 'account');
    }
  });

  $('input[type=checkbox]#status').change(function (e) {
    e.preventDefault();

    $('input#statusValue').val($(this).prop('checked') ? 'Activo' : 'Inactivo');
    
    return false;
  });

  $('.addEquipmentTypeSubmit, .addEquipmentSubmit').click(function (e) {
    e.preventDefault();

    $(document).find('[name="requireFieldMessage"]').remove();				

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};

    _.each(form, function (item, i) {
      var control = $(item);
      
      if (typeof control.attr("class") === 'undefined') {
        return;
      }

      if ((control.attr('class')).indexOf('form-control') > -1 || control.attr('type') === 'hidden') {
        if (control.prop('tagName').toLowerCase() === 'input' || control.prop('tagName').toLowerCase() === 'textarea') {
          if (control.val().trim().length > 0) {
            if (item.getAttribute("type")=="email"){
              if (!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)) {
                $(item).after('<p style="color:red;" name="description">Correo invalido</p>');
                return;
              }
            }

            if (item.getAttribute("type")=="phone") {              
              if (!(/^[0-9]+$/ig).exec(item.value)) {
                $(item).after('<p style="color:red;" name="description">Campo debe ser numérico</p>');
                return;
              }
            }
            data[control.attr('name')] = control.val().trim();
          }
          else {
            control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
          }
        }
        else if (control.prop('tagName').toLowerCase() === 'select') {
          var itemValue = control.find('option:selected').attr('value');							

          if (typeof itemValue !== 'undefined') {
            data[control.attr('name')] = itemValue;
          }
          else {
            control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
          }
        }
      }
    });

    if (!$(form).find('[name="requireFieldMessage"]').length > 0) {					
      var action = $($(this).parents('form')).attr('action');

      $.post(action, data, function (response) {						
        if (!response.error) {
          $('#addEquipmentTypeModal, #addEquipmentModal').modal('hide');
          
          window.location.reload(true);

          return false;
        }
        else {

        }
      });
    }

    return false;
  });

  $('#updateEquipmentTypeSubmit').click(function (e) {
    e.preventDefault();
    
    var form = document[$($(this).parents('form')).attr('name')];
    var action = $($(this).parents('form')).attr('action').concat('/', $(form).find('input[type=hidden]').val());
    var data = {};
    var onSuccess = function (response) {
      $('#updateEquipmentTypeModal').modal('hide');
      
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

      if ((control.attr('class')).indexOf('form-control') > -1 || (control.attr('class')).indexOf('form-control-custom') > -1 || control.attr('type') === 'hidden') {
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

    updateRequest(action, data, onSuccess, onFailure);

    return false;
  });

  $('#startAttentionSubmit, #finishAttentionSubmit').click(function (e) {
    e.preventDefault();

    var form = document[$($(this).parents('form')).attr('name')];
    var action = $($(this).parents('form')).attr('action').concat('/', $(form).find('input[type=hidden]').val());
    var data = {};
    var onSuccess = function (response) {
      if (typeof data.started !== 'undefined') {
        $('#updateMaintenanceActivityAttentionGroup button#startAttentionSubmit').hide();
        $('#updateMaintenanceActivityAttentionGroup button#finishAttentionSubmit').show();
        $('#updateMaintenanceActivityAttentionGroup span#notStarted').hide();
        $('#updateMaintenanceActivityAttentionGroup span#inProgress').show();
        $('#updateMaintenanceActivityAttention button#updateMaintenanceActivityAttentionSubmit').show();
        $('#updateMaintenanceActivityAttention .form-group input[type=checkbox]').attr('disabled', false);
        $('#updateMaintenanceActivityAttention div#commentRow').show();
      }
      else if (typeof data.finished !== 'undefined') {
        $('#updateMaintenanceActivityAttentionGroup button#finishAttentionSubmit').hide();
        $('#updateMaintenanceActivityAttentionGroup span#inProgress').hide();
        $('#updateMaintenanceActivityAttentionGroup span#finished').show();
        $('#updateMaintenanceActivityAttention button#updateMaintenanceActivityAttentionSubmit').hide();
        $('#updateMaintenanceActivityAttention .form-group input[type=checkbox]').attr('disabled', true);
      }

      return false;
    };
    var onFailure = function (xhr, status, error)  {
      var response = xhr.responseJSON;
      
      console.log(JSON.stringify(response));
      
      return false;
    };

    if (/^start/.test($(this).attr('id')) === true) {
      data['started'] = true;
    }
    else if (/^finish/.test($(this).attr('id')) === true) {
      data['finished'] = true;
    }

    updateRequest(action, data, onSuccess, onFailure);

    return false;
  });

  $('#updateMaintenanceActivityAttention input[type=checkbox]').change(function (e) {
    e.preventDefault();

    var value = true;

    if (typeof $(this).prop('changed') === 'undefined') {
      $(this).prop('changed', true);
    }
    else {
      value = $(this).prop('changed');

      $(this).prop('changed', !value);
    }

    return false;
  });

  $('#updateMaintenanceActivityAttentionSubmit').click(function (e) {
    e.preventDefault();
    
    var form = document[$($(this).parents('form')).attr('name')];
    var baseAction = $($(this).parents('form')).attr('action');
    var data = {};
    var onSuccess = function (response) {
      var selector = '#updateMaintenanceActivityAttention .form-group input#'.concat(response.data._id);
      $(selector).notify('La selección ha sido actualizada', {
        className: 'success',
        elementPosition: 'right middle'
      });
      $(selector).prop('changed', false);

      return false;
    };
    var onFailure = function (xhr, status, error)  {
      var response = xhr.responseJSON;
      
      if (status === 500) {
        var selector = '#updateMaintenanceActivityAttention .form-group input#'.concat(response.document);
        var value = $(selector).prop('checked');

        $(selector).prop('checked', !value);
      }
      
      console.log(JSON.stringify(response));
      
      return false;
    };

    _.each(form, function (item) {
      var control = $(item);
      var action = '';
      
      if ((control.attr('class')).indexOf('form-control-custom') > -1) {
        if (control.prop('tagName').toLowerCase() === 'input') {
          if (control.attr('type') === 'checkbox' && control.prop('changed') === true) {
            data['checked'] = control.prop('checked');
            action = baseAction.concat('/', control.attr('id'));

            updateRequest(action, data, onSuccess, onFailure);
          }
        }
      }
    });

    return false;
  });

  $(document).on('click', '.searchEquipmentType, .deleteEquipmentType', function(e){
    e.preventDefault();
    var _id = this.getAttribute('data-id');
    if($(this).hasClass('searchEquipmentType')){
      searchEquipmentType(_id);
    }else{
      deleteEquipmentType(_id);
    }
  });

  $('#equipmentTypeSearchButtom, #equipmentSearchButtom').click(function(e){
    e.preventDefault();
    var type= $(this).attr('data-type'), 
        selector=type=='equipmentTypes'?'table-equipmentType':'table-equipment', 
        searchImput = $('#'.concat(type=='equipmentTypes'?'equipmentTypeSearchInput':'equipmentSearchInput')).val(), 
        url='', rows='';

      url='/'.concat(type, '/0/1000/', searchImput.length?searchImput:'all');
      
      $.get(url, function(data){
        
        if(!data.error){

          if(type=='equipmentTypes'){
            _.each(data.data, function(value, key){
              rows=rows.concat(
                '<tr><td>',key+1, '</td>',
                '<td>', value.name, '</td>',
                '<td>', value.company.name, '</td>',
                '<td>', value.status ? 'Activo': 'Inactivo', '</td>',
                '<td><a class="btn default btn-xs blue-stripe searchEquipmentType" data-id="',value._id,'">Editar</a></td>',
                '<td><i class="fa fa-trash deleteEquipmentType" data-id="',value._id,'" aria-hidden="true"></i></td></tr>')
            });
          }else{
            _.each(data.data, function(value, key){
              rows=rows.concat(
                '<tr><td>',key+1, '</td>',
                '<td>', value.name, '</td>',
                '<td>', value.code, '</td>',
                '<td>', value.location, '</td>',
                '<td>', value.equipmentType.name, '</td>',
                '<td>', value.branchCompany.company.name, '</td>',
                '<td>', value.branchCompany.name, '</td>',
                '<td>', value.userAssigned.name, '</td>',
                '<td><a class="btn default btn-xs blue-stripe" href="/home/equipments/',value._id,'">Editar</a></td>',
                '<td><i class="fa fa-trash" aria-hidden="true"></i></td></tr>')
            });
          }
          $('.'.concat(selector, ' tbody')).empty();
          $('.'.concat(selector, ' tbody')).html(rows);
        }
      });

  });

  return false;
});