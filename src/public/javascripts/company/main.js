$(document).ready(function () {
  $('#tabCompany a').click(function (e) {
    e.preventDefault();
    
    $(this).tab('show');
  });

  $('#addComapny').click(function (e) {
    $('#addCompanyModal').modal('show');
  });

  $('#addBranchCompany').click(function (e) {
    $('#addBranchCompanyModal').modal('show');
  });

  $('.addComapnySubmit, .addBranchCompanySubmit').click(function (e) {
    e.preventDefault();

    $(document).find('[name="description"]').remove();				

    var form = document[$($(this).parents('form')).attr('name')];
    var data = {};

    _.each(form, function (item, i) {
      if (item.getAttribute('class') === 'form-control' || item.type === 'hidden') {
        if (item.tagName.toLowerCase() === 'input' || item.tagName.toLowerCase() === 'textarea') {
          
          if (item.value.length > 0) {
            if(item.getAttribute("type")=="email"){
              if(!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="description">Correo invalido</p>');
                return;
              }
            }
            if(item.getAttribute("type")=="phone"){              
              if(!(/^[0-9]+$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="description">Cmapo debe ser numérico</p>');
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
      });
      
    }
  });
  
  $(document).on('click', '.edit-company', function(e){
    e.preventDefault();
    $('#editCompanyModal').modal('show');
    
    $(".editModal #company").parents(".form-group").hide()
    
    var action = this.getAttribute('href');
    
    $.get(action, function(data){
      var form=data.data,
          docform= document.editCompanyForm;
      _.each(docform, function(doc, key){
        if(doc.className=="form-control"){
          var element = form[doc.getAttribute("name")];
           
          if(typeof element == "object"){
            $(".editModal #".concat(doc.getAttribute("name"))).parents(".form-group").css({display:''});
            $(".editModal #".concat(doc.getAttribute("name"), " option[value='",element._id,"']")).attr("selected", true);
          }else if(element!= undefined){
            $(".editModal #".concat(doc.getAttribute("name"))).val(element);
          }
        }
      });
      
      var editStatus = $('.editModal #status');

      if(form.status)
        editStatus.attr('checked', true);
      else
        editStatus.removeAttr('checked');

    });
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
          else if (item.value.length > 0) {
            if(item.getAttribute("type")=="email"){
              if(!(/^[a-zA-Z0-9_-]+\@[a-zA-Z0-9]+\.[a-zA-Z0-9-]{0,5}$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="description">Correo invalido</p>');
                return;
              }
            }
            if(item.getAttribute("type")=="phone"){              
              if(!(/^[0-9]+$/ig).exec(item.value)){
                $(item).after('<p style="color:red;" name="description">Cmapo debe ser numérico</p>');
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
          else if(item.getAttribute('required')!=null) {
            $(item).after('<p style="color:red;" name="description">Campo requerido</p>');
          }
        }

      }
    });

    if (!$(form).find('[name="description"]').length > 0) {
      var _form = $($(this).parents('form')),
          action = _form.attr('action').concat('/',$('#_id').val()),
          method = _form.attr('method');
      
      var request = $.ajax({
        url: action,
        method: method,
        data: data
      });
       
      request.done(function (response) {        
        if (!response.error) {
          var obj = response.data;         
          window.location.reload();
        }

        return false;
      });
       
      request.fail(function(j, error) {
        console.log("Fail on update: " + error);
      });

    }
  });

  $('input[type=checkbox]#status').change(function (e) {
    e.preventDefault();
    $('input#statusValue').val($(this).prop('checked') ? 'Activo' : 'Inactivo');
    return false;
  });

  $('#entitySearchButtom, #entityBranchSearchButtom').click(function(e){
    e.preventDefault();    
    var type= $(this).attr('data-type'), 
        selector=type=='company'?'table-entity':'table-branchEntity',
        buttomSelector=type=='company'?'companySearchInput':'branchCompanySearchInput';
        searchImput = $('#'.concat(buttomSelector)).val(),        
        url='/entities/0/1000/'.concat(type, '/', searchImput.length?searchImput:'all');

    $.get(url, function(data){
      $('.'.concat(selector, ' tbody')).empty();
      $('.'.concat(selector, ' tbody')).html(data);        
    });
  });
  
});