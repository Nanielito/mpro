$(document).ready(function () {
  $('#addComapny').click(function (e) {
    $('#addCompanyModal').modal('show');

    return false;
  });

  $('#addBranchCompany').click(function (e) {
    $('#addBranchCompanyModal').modal('show');

    return false;
  });

  $('.addComapnySubmit, .addBranchCompanySubmit').click(function (e) {
    e.preventDefault();

    $(document).find('[name="description"]').remove();				

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};

    _.each(form, function (item, i) {
      if (item.getAttribute('class') === 'form-control' || item.type === 'hidden') {
        if (item.tagName.toLowerCase() === 'input' || item.tagName.toLowerCase() === 'textarea') {
          if (item.value.length  || item.getAttribute('no-required') != null) {            
            if (item.getAttribute('type') === 'email') {
              if (!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value) && item.length > 0) {
                $(item).after('<p style="color:red;" name="description">Correo invalido</p>');
                return;
              }
            }

            if (item.getAttribute('type') === 'phone') {
              if (!(/^[0-9]+$/ig).exec(item.value) && item.length > 0) {
                $(item).after('<p style="color:red;" name="description">Campo debe ser numérico</p>');
                return;
              }
            }

            data[item.name] = item.value;
          }
          else {
            $(item).after('<p style="color:red;" name="description">Campo requerido</p>');
          }
        }
        else if (item.tagName.toLowerCase() === 'select') {
          var itemValue = $(item).find('option:selected').attr('value');							

          if (itemValue !== undefined) {
            data[item.name] = itemValue;
          }
          else {
            $(item).after('<p style="color:red;" name="description">Campo requerido</p>');
          }
        }
      }
    });

    if (!$(form).find('[name="description"]').length > 0) {
      var action = $($(this).parents('form')).attr('action');

      $.post(action, data, function (response) {						
        if (!response.error) {
          $('#addCompanyModal, #addBranchCompanyModal').modal('hide');
          window.location.reload(true);
        }
        else {

        }

        return false;
      });
    }

    return false;
  });
  
  $(document).on('click', '.edit-company', function (e) {
    e.preventDefault();
    $('#editCompanyModal').modal('show');
    
    $('.editModal #company').parents('.form-group').hide()
    
    var action = this.getAttribute('href');
    
    $.get(action, function (response) {
      var data = response.data;
      var form = document.editCompanyForm;

      _.each(form, function (item, i) {
        var itemName = item.getAttribute('name');
        var element = null;

        if (item.className === 'form-control') {
          element = data[itemName];
           
          if (typeof element === 'object') {
            $('.editModal #'.concat(itemName)).parents('.form-group').css({display: ''});
            $('.editModal #'.concat(itemName, ' option[value="', element._id, '"]')).attr('selected', true);
          }
          else if (element !== undefined) {
            $('.editModal #'.concat(itemName)).val(element);
          }
        }
        else if (item.className === 'form-control-custom') {
          element = data[itemName];

          if (element !== undefined) {
            if (itemName === 'status') {
              if (element) {
                $('.editModal #'.concat(itemName)).attr('checked', true);
                $('.editModal #'.concat(itemName, 'Value')).val('Activo');
              }
              else {
                $('.editModal #'.concat(itemName)).removeAttr('checked');
                $('.editModal #'.concat(itemName, 'Value')).val('Inactivo');
              }
            }
          }
        }
      });

      return false;
    });

    return false;
  });

  $('.editCompanySubmit').click(function (e) {
    e.preventDefault();

    $(document).find('[name="description"]').remove();				

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};

    _.each(form, function (item, i) {      
      if (item.getAttribute('class') === 'form-control' || item.type === 'hidden' || item.getAttribute('class') == 'form-control-custom') {
        if (item.tagName.toLowerCase() === 'input' || item.tagName.toLowerCase() === 'textarea') {
          
          if (item.getAttribute('type') === 'checkbox') {            
            data[item.name] = $(item).prop('checked');
          }
          else if (item.value.length > 0 && !item.getAttribute('no-required')) {
            if (item.getAttribute('type') === 'email') {
              if (!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)) {
                $(item).after('<p style="color:red;" name="description">Correo invalido</p>');
                return;
              }
            }

            if (item.getAttribute('type') === 'phone') {              
              if (!(/^[0-9]+$/ig).exec(item.value)) {
                $(item).after('<p style="color:red;" name="description">Campo debe ser numérico</p>');
                return;
              }
            }

            data[item.name] = item.value;
          }
          else {
            $(item).after('<p style="color:red;" name="description">Campo requerido</p>');
          }
        }
        else if (item.tagName.toLowerCase() === 'select') {
          var itemValue = $(item).find('option:selected').attr('value');          
          
          if (itemValue !== undefined) {
            data[item.name] = itemValue;
          }
          else if(item.getAttribute('required') !== null) {
            $(item).after('<p style="color:red;" name="description">Campo requerido</p>');
          }
        }
      }
    });

    if (!$(form).find('[name="description"]').length > 0) {
      var form = $($(this).parents('form'));
      var action = form.attr('action').concat('/', $('#_id').val());
      var method = form.attr('method');
      
      var request = $.ajax({
        url   : action,
        method: method,
        data  : data
      });
       
      request.done(function (response) {        
        if (!response.error) {
          var data = response.data;         
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

  $('input[type=checkbox]#status').change(function (e) {
    e.preventDefault();
    $('input#statusValue').val($(this).prop('checked') ? 'Activo' : 'Inactivo');
    
    return false;
  });

  $('#entitySearchButton, #entityBranchSearchButton').click(function (e) {
    e.preventDefault();
    
    var type = $(this).attr('data-type'); 
    var selector = (type === 'company' ? 'table-entity' : 'table-branchEntity');
    var buttonSelector = (type === 'company' ? 'companySearchInput' : 'branchCompanySearchInput');
    var searchInput = $('#'.concat(buttonSelector)).val();        
    var url = '/entities/0/1000/'.concat(type, '/', (searchInput.length ? searchInput : 'all'));

    $.get(url, function (data) {
      $('.'.concat(selector, ' tbody')).empty();
      $('.'.concat(selector, ' tbody')).html(data);
      
      return false;
    });
  });
  
  return false;
});