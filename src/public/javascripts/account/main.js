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

function setDropDownListOptions(actionName, parameter, containerName, option) {
  var action = ''.concat(actionName ,'/', parameter);
  var container = $('select#'.concat(containerName)); 

  container.empty();
  
  $.get(action, function (response) {
    var options = '';
    
    if (container.prop('multiple') === false) {
      options = options.concat('<option>Seleccione</option>');
    }    
    _.each(response.data, function (item, i) {
      options = options.concat('<option value="', item._id,'"',option!=undefined?item._id==option.selected?" selected='selected' ":"":"", '>', item.name, '</option>');
    });

    container.append(options);
    
    return false;
  });

  return false;
}

function getAvatar(done){
  var avatars=[], gitavatar, aux, result;
  var url = 'https://octodex.github.com';
  $.get(url, function(data) {    
    $(data).find('.item a').each(function(k, v){
      gitavatar = $(v).first().children().attr('data-src');
      if(gitavatar!=undefined){
        aux=''.concat(url, gitavatar);
        avatars.push(aux);
      }
    });
    result=avatars[Math.floor(getRandom(0, avatars.length))];
    done(result);
  });
};

function getRandom(min, max){
  return Math.random()*(max-min)+min;
};

$(document).ready(function () {
  var avatarImg='';
  getAvatar(function(image){    
    avatarImg=image;
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
    $.get(action, function(data){
      var form=data.data;
      
      $('#editAccountModal #name').val(form.name);
      $('#editAccountModal #username').val(form.email);
      $('#editAccountModal #hidden_id').val(form._id);
      
      $('#editAccountModal select#role option[value="'.concat(form.role, '"]')).attr('selected', true);
      
      if($("#editAccountModal #company").prop('tagName').toLowerCase()=='select'){
        if(form.role=='adminBranchCompany'||form.role=='technician'){
          $('#editAccountModal  select#company option[value="'.concat(form.company.company._id, '"]')).attr('selected', true);
        }
        else{
          $('#editAccountModal select#company option[value="'.concat(form.company._id, '"]')).attr('selected', true);
        }
      }

      if(form.role=='adminBranchCompany'||form.role=='technician'){
        setDropDownListOptions('/entities/branchCompanies/company', form.company.company._id, 'branchCompany',{selected:form.company._id});
      }
      
      var editStatus = $('#editAccountModal #status');

      if(form.status)
        editStatus.attr('checked', true);
      else
        editStatus.removeAttr('checked');
    });
  });

  $('select#company').change(function (e) {
    e.preventDefault();
    
    var companyId = $(this).find('option:selected').val();

    if (companyId === 'Seleccione') {
      setDefaultDropDownListOption('branchCompany');
    }
    else {
      setDropDownListOptions('/entities/branchCompanies/company', companyId, 'branchCompany');
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
    var data={}, _this=this;
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
            if(item.getAttribute("type")=="email"){
              if(!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="requireFieldMessage">Correo invalido</p>');
                return;
              }
            }
            if(item.getAttribute("type")=="phone"){              
              if(!(/^[0-9]+$/ig).exec(item.value)){
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
      data.image=avatarImg;
      
      var request = $.ajax({
        url: action,
        method: 'POST',
        data: data
      });
       
      request.done(function (response) {
        
        if (!response.error) {
          var obj = response.data;   
          
          if (obj) {
            if (obj.name !== $.trim($('#entityName').val())) {
              $('#entityName').text(obj.name);
            }
            
            if (obj.email !== $.trim($('#entityEmail').val())) {
              $('#entityEmail').text(obj.email);
            }
            
            if (obj.location !== $.trim($('#entityLocation').val())) {
              $('#entityLocation').val(obj.location);
            }           
          }
          document.addAccountForm.reset();
          $('#editEntityModal, #addBranchCompanyModal, #addAccountModal').modal('hide');
          window.location.reload();
        }

        return false;
      });
       
      request.fail(function(j, error) {
        console.log("Fail on update: " + error);
      });
    }

    return false;
  });

  $('.editAccountSubmit').click(function (e) {
    e.preventDefault();
    var data={}, _this=this;
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
          }else{    
            if(item.getAttribute("type")=="email"){
              if(!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)){
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
      var _form = $($(this).parents('form')),
          action = _form.attr('action').concat('/',$('#hidden_id').val()),
          method = _form.attr('method');

      var request = $.ajax({
        url: action,
        method: method,
        data: data
      });
       
      request.done(function (response) {
        
        if (!response.error) {
          var obj = response.data;          
          document.addAccountForm.reset();
          $('#editEntityModal, #addBranchCompanyModal, #addAccountModal').modal('hide');
          window.location.reload();
        }

        return false;
      });
       
      request.fail(function(j, error) {
        console.log("Fail on update: " + error);
      });
    }

    return false;
  });
  
  $('#userSearchButtom').click(function(e){
    e.preventDefault();
    var searchImput = $('#userSearchInput').val(), url='', rows='';        
      url='/accounts/0-1000/'.concat(searchImput.length?searchImput:'all');
      $.get(url, function(data){        
        $('.table tbody').empty();
        $('.table tbody').html(data);        
      });
  });

});