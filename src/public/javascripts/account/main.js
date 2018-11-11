function setDefaultDropDownListOption(parentContainerName, containerName) {
  var container = $('#'.concat(parentContainerName, ' select#', containerName));
  var option = '';

  container.empty();
  
  if (container.prop('multiple') === false) {
    option = option.concat('<option>Seleccione</option>');
  }

  container.append(option);

  return false;
}

function setDropDownListOptions(actionName, parameter, parentContainerName, containerName, option) {
  var action = ''.concat(actionName ,'/', parameter);
  var container = $('#'.concat(parentContainerName ,' select#', containerName));

  container.empty();
  
  $.get(action, function (response) {
    var options = '';
    
    if (container.prop('multiple') === false) {
      options = options.concat('<option>Seleccione</option>');
    }

    _.each(response.data, function (item, i) {
      options = options.concat('<option value="', item._id, '"', (option !== undefined ? (item._id === option.selected ? " selected='selected' " : "") : ""), '>', item.name, '</option>');
    });

    container.append(options);
    
    return false;
  });

  return false;
}

function getAvatar(done) {
  var avatars = [], gitAvatar, aux, result;
  var url = 'https://octodex.github.com';

  $.get(url, function (data) {    
    $(data).find('.item a').each(function (k, v) {
      gitAvatar = $(v).first().children().attr('data-src');
      
      if (gitAvatar !== undefined) {
        aux = ''.concat(url, gitAvatar);
        avatars.push(aux);
      }
    });

    result = avatars[Math.floor(getRandom(0, avatars.length))];
    done(result);

    return false;
  });
};

function getRandom(min, max){
  return Math.random() * (max - min) + min;
};

$(document).ready(function () {
  var avatarImg = '';

  getAvatar(function (image) {    
    avatarImg = image;

    return false;
  });

  $('#addAccount').click(function (e) {
    $('#addAccountModal').modal('show');
    $('input[type=checkbox]#status').trigger('change');

    return false;
  });

  $(document).on('click', 'a[name="editAccount"]', function (e) {
    e.preventDefault();

    $('#editAccountModal').modal('show');

    var action = this.getAttribute('href').concat('/', this.getAttribute('data-id'));
    
    $.get(action, function (response) {
      var data = response.data;
      
      $('#editAccountModal select option').removeAttr('selected');

      $('#editAccountModal #name').val(data.name);
      $('#editAccountModal #username').val(data.email);
      $('#editAccountModal #hidden_id').val(data._id);
      
      $('#editAccountModal select#role option[value="'.concat(data.role, '"]')).attr('selected', true);
      
      if ($("#editAccountModal #company").prop('tagName').toLowerCase() === 'select') {
        if (data.role === 'adminBranchCompany' || data.role === 'technician') {
          $('#editAccountModal select#company option[value="'.concat(data.company.company._id, '"]')).attr('selected', true);
        }
        else {
          $('#editAccountModal select#company option[value="'.concat(data.company._id, '"]')).attr('selected', true);
        }
      }

      if (data.role === 'adminBranchCompany' || data.role === 'technician') {
        setDropDownListOptions('/entities/branchCompanies/company', data.company.company._id, 'editAccountModal', 'branchCompany', {selected:data.company._id});
      }
      
      var status = $('#editAccountModal #status');
      var statusValue = $('#editAccountModal #statusValue');

      if (data.status) {
        status.attr('checked', true);
        statusValue.val('Activo');
      }
      else {
        status.removeAttr('checked');
        statusValue.val('Inactivo');
      }

      return false;
    });

    return false;
  });

  $('select#company').change(function (e) {
    e.preventDefault();
    
    var parentContainerName = $(this).parents('form').parents('.modal').attr('id');
    var companyId = $(this).find('option:selected').val();

    if (companyId === 'Seleccione') {
      setDefaultDropDownListOption(parentContainerName, 'branchCompany');
    }
    else {
      setDropDownListOptions('/entities/branchCompanies/company', companyId, parentContainerName, 'branchCompany');
    }

    return false;
  });

  $('input[type=checkbox]#status').change(function (e) {
    e.preventDefault();

    $('input#statusValue').val($(this).prop('checked') ? 'Activo' : 'Inactivo');
    
    return false;
  });

  $('.addAccountSubmit').click(function (e) {
    e.preventDefault();

    var data = {};
    
    $('#warningAccountForm').css({display: 'none'});
    $('#warningAccountForm #content').empty();
    $(document).find('[name="requireFieldMessage"]').remove();

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};

    _.each(form, function (item, i) {
      var control = $(item);

      if (control.attr('class').indexOf('form-control') > -1 || control.attr('class').indexOf('form-control-custom') > -1 || control.attr('type') === 'hidden') {
        if (control.prop('tagName').toLowerCase() === 'input' || control.prop('tagName').toLowerCase() === 'textarea') {
          if (control.attr('type') === 'checkbox') {
            data[control.attr('name')] = control.prop('checked');
          }
          else if (control.val().trim().length > 0) {
            if (item.getAttribute('type') === 'email') {
              if (!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="requireFieldMessage">Correo invalido</p>');
                return;
              }
            }
            if (item.getAttribute('type') === 'phone') {              
              if (!(/^[0-9]+$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="requireFieldMessage">Campo debe ser numérico</p>');
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

          if (itemValue !== undefined) {
            data[control.attr('name')] = itemValue;
          }
          else if (control.attr('required') !== undefined) {
            control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
          }
        }
      }
    });

    var roleControl = $(form).find('#role');
    var branchCompanyControl = $(form).find('#branchCompany');

    if (typeof roleControl !== 'undefined' && $(branchCompanyControl).val() === 'Seleccione') {
      if ((/adminBranchCompany|technician/).test($(roleControl).val()) === true) {
        $(branchCompanyControl).after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
      }
    }

    if (!$(form).find('[name="requireFieldMessage"]').length > 0) {
      var action = $($(this).parents('form')).attr('action');
      data.image = avatarImg;
      
      var request = $.ajax({
        url   : action,
        method: 'POST',
        data  : data
      });
       
      request.done(function (response) {
        if (!response.error) {
          var data = response.data;   
          
          if (data) {
            if (data.name !== $.trim($('#entityName').val())) {
              $('#entityName').text(data.name);
            }
            
            if (data.email !== $.trim($('#entityEmail').val())) {
              $('#entityEmail').text(data.email);
            }
            
            if (data.location !== $.trim($('#entityLocation').val())) {
              $('#entityLocation').val(data.location);
            }           
          }

          document.addAccountForm.reset();
          $('#editEntityModal, #addBranchCompanyModal, #addAccountModal').modal('hide');
          window.location.reload();
        }

        return false;
      });
       
      request.fail(function(error) {        
        $(form).find('.form-group:eq(0)').before('<p style="color:red;" name="requireFieldMessage">'.concat(error.responseText,'</p>'));        
      });
    }

    return false;
  });

  $('.editAccountSubmit').click(function (e) {
    e.preventDefault();

    var data = {};
    
    $('#warningAccountForm').css({display: 'none'});
    $('#warningAccountForm #content').empty();
    $(document).find('[name="requireFieldMessage"]').remove();

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};
    
    _.each(form, function (item, i) {
      var control = $(item);
      
      if (control.attr('class').indexOf('form-control') > -1 || control.attr('class').indexOf('form-control-custom') > -1 || control.attr('type') === 'hidden') {
        if (control.prop('tagName').toLowerCase() === 'input' || control.prop('tagName').toLowerCase() === 'textarea') {
          if (control.attr('type') === 'checkbox') {
            data[control.attr('name')] = control.is(':checked');
          }
          else {    
            if (item.getAttribute('type') === 'email') {
              if (!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="requireFieldMessage">Correo invalido</p>');              
              }
            }

            data[control.attr('name')] = control.val().trim();
          }
        }
        else if (control.prop('tagName').toLowerCase() === 'select') {
          var itemValue = control.find('option:selected').attr('value');

          if (itemValue !== undefined) {
            data[control.attr('name')] = itemValue;
          }
          else if (control.attr('required') !== undefined) {
            control.after('<p style="color:red;" name="requireFieldMessage">Campo requerido</p>');
          }
        }
      }
    });

    if (!$(form).find('[name="requireFieldMessage"]').length > 0) {
      var _form = $($(this).parents('form'));
      var action = _form.attr('action').concat('/',$('#hidden_id').val());
      var method = _form.attr('method');

      var request = $.ajax({
        url   : action,
        method: method,
        data  : data
      });
       
      request.done(function (response) {
        if (!response.error) {
          var data = response.data;          
          
          document.addAccountForm.reset();
          $('#editEntityModal, #addBranchCompanyModal, #addAccountModal').modal('hide');
          window.location.reload();
        }

        return false;
      });
       
      request.fail(function(jqXHR, error) {
        console.log('Fail on update: '.concat(error));

        return false;
      });
    }

    return false;
  });
  
  $('#userSearchButton').click(function (e) {
    e.preventDefault();

    var searchInput = $('#userSearchInput').val();
    var url = '/accounts/0-1000/'.concat(searchInput.length ? searchInput : 'all');
      
    $.get(url, function (data) {        
      $('.table tbody').empty();
      $('.table tbody').html(data);
      
      return false;
    });
  });

  return false;
});