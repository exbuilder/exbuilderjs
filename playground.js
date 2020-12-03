// javascript to control the playground UI
var s, 
 Playground = {
     settings: {
         pluginList: "list of plugins for selected jsPsych release",
         selectedPlugin: "user selected plugin",
         selectedRelease: "user selected jsPsych release",
         form: {
             defaults: "holds the defaults of the curretly selected plugin, used to populate the form",
             userdata: "holds the user input to the form",
             warning: "holds the warning text updated by the validateUserData()",
             formgroup: ['div', 'label', 'input', 'small']
         }
     },

     init: function() {

        // initalize the settings and make sure warning well is hidden
         s = this.settings; 
         $('#warning-well').hide();

         this.bindUIActions();
     },

     bindUIActions: function(){

        $('#pluginSelector').on('change', function() {
             // get the selected plugin
             var name = $( "#pluginSelector option:selected" ).text();
             s.selectedPlugin = s.pluginList[name];

             document.getElementById("plugin-name").innerHTML = s.selectedPlugin.name;
             document.getElementById("plugin-description").innerHTML = s.selectedPlugin.description;
             document.getElementById("plugin-docs").href = s.selectedPlugin.docs;

             // get the parameters for this plugin
             Playground.getPluginParams();
         }),

         $('#previewButton').on('click', function(){

             // clear the error well and hide it
             $('#warning-well').hide();
             $('#warning-well').empty();

             // get the form data the user has entered
             Playground.getFormData();
         });

         $('#releaseSelector').on('change', function() {

            // get the selected release and then fetch it's plugins
            s.selectedRelease = $( "#releaseSelector option:selected" ).text();
            Playground.fetchPlugins();
        });

     },

     fetchPlugins: function(){

         // pass users selected jspsych release to the playground js
         // and then fetch the plugins from github exbuilderjs repo
        fetch('https://exbuilder.github.io/jspsych-plugins/'+s.selectedRelease+'.json')
            .then(response => response.json())
            .then(data => { s.pluginList = data.plugins });
     },

     getPluginParams: function() {

         // clear the parameter form and the data we were holding
         document.getElementById("#parameter-form").reset();
         s.form.userdata = {};

         // set the form defaults to the newly selected plugin parameters
         s.form.defaults = s.selectedPlugin.parameters
         
         // then get the new plugin parameters
         this.stringifyArrays();
     },

     stringifyArrays: function() {

         // check if the value of the key is an array; if yes, stringify
         // this helps them show up as arrays on the user end
         s.form.defaults.forEach(
             (parameter, index) => {
                 for (const [key, value] of Object.entries(parameter)) {
                     if(Array.isArray(value)){
                         s.form.defaults[index][key] = JSON.stringify(value);
                     } else {
                         s.form.defaults[index][key] = value;
                     }
                 }
             });

         // then make the form!
         this.makeForm();
         
     },

     makeForm: function() {
         
        // clear the parameter well and regenerate it with the newly selected plugin defaults
         $("#parameter-well").empty();
         s.form.defaults.forEach(
             (parameter, index) => { this.makeFormGroup(parameter, index); }
         );  

         // then get the default data from the form to generate immediate the preview
         this.getFormData();
     },
     makeFormGroup: function(parameter, index) {

         // this is the biggest function; it's doing a lot of things, which I don't love.
         // Basically, for element in the form group, it generates the HTML 
         s.form.form_group.forEach( 

             element => {  
                 // for every element, first we'll create it; making sure to handle 
                 // that textarea inputs need to be textarea
                 const type = (element==="input" & parameter.type==='array') ? 'textarea' : element; 
                 const el = document.createElement(type);

                 // then we'll create the rest of the things that particular element needs
                 // this depends on what it is (div, input, etc), so we'll handle the differences with a switch 
                 switch (element) {
                     case "div":
                         el.className += ' form group'
                         el.id = 'form-div-'+index
                         break;

                     case "label":
                         el.className += 'form-control-label'
                         el.for = parameter.name;
                         el.innerHTML = parameter.pretty_name;
                         break;

                     case "input":
                         el.className += ' form-control form-control-sm'
                         el.id = parameter.name;
                         el.name = parameter.name;
                         el.value = parameter.default;
                         el.placeholder = parameter.default;
                         el.type = "text";
                         break;

                     case "small":
                         el.className += ' form-text text-muted'
                         el.id = parameter.name;
                         el.innerHTML = parameter.description;
                         break;
                 };
                 // when we're done, we want to append the child to the right target
                 const target = (type === 'div') ? 'parameter-well' : 'form-div-'+index;
                 document.getElementById(target).appendChild(el);
             }      
         )
     },

     getFormData: function() {

         // get the form data 
         var form = document.querySelector('#parameterForm');
         var data = new FormData(form);

         // next parse it
         this.parseFormData(data);
     },

     parseFormData: function(data){

         // parse JSON if we need to 
         data.forEach((value, key) => {
             try {
                 s.form.userdata[key] = JSON.parse(value);
             } catch (error) {
                 s.form.userdata[key] = value;
             }
         });

         // now that it's parsed, validate it
         this.validateUserData();
     },

     validateUserData: function(){

         // give users some helpful hints if they're trying to enter
         // stuff that won't work in jsPsych
         console.log("validating user input...");
         
         for (const [key, value] of Object.entries(s.form.userdata)) {
             
             // start out with is_valid as false and get the current parameter by name
             var is_valid = false;
             var parameter = s.form.defaults.find(x => x.name === key);

             switch (parameter.type) {
                 case "numeric":
                     // if it's not a number, then it's not valid
                     is_valid = (typeof value === "number");
                     s.form.warning = '<strong>'+key+'</strong>'+' needs to be numeric';
                     break;

                 case "integer":
                     // if it's not an integer, then it's not valid
                     is_valid = Number.isInteger(value)
                     s.form.warning = '<strong>'+key+'</strong>'+' must be an integer';
                     break;

                 case "string":
                     // if it's not valid JSON, then it's not valid
                     is_valid = true;
                     s.form.warning = '<strong>'+key+'</strong>'+' must be a string';
                     break;
                 
                 case "textarea":
                     // if it's not valid JSON, then it's not valid
                     is_valid = true;
                     s.form.warning = '<strong>'+key+'</strong>'+' must be a string';
                     break;

                 case "array":
                     // if it's not an Array, then it's not valid
                     is_valid = Array.isArray(value)
                     s.form.warning = '<strong>'+key+'</strong>'+' must be an array';
                     break;

                 case "path":
                     // if there's not a file at the path, then it's not valid
                     is_valid = false;
                     s.form.warning = '<strong>'+key+'</strong>'+' there is no file at this path';
                     break;
                 
                 case "boolean":
                     // if it's not true or false it's not valid 
                     is_valid = (typeof value === "boolean");
                     s.form.warning = '<strong>'+key+'</strong>'+' must be a boolean (true or false)';
                     break;

                 default:
                     is_valid = false;
                     s.form.warning = "<strong>"+key+"</strong>"+" exbuilder doesn't recognize this parameter type: "+parameter.type;
             }

             // if not valid, update the validation alert with the alert message 
             if (!(is_valid)) { this.showValidationError(s.form.warning)}
         };

         // then show the preview; pass to jsPsych even if validation fails
         // so user can also debug in the console if they want.
         this.getJsPsychPreview();
     },

     showValidationError: function(warning){

        // Update the warning well and show it
        document.getElementById("#warning-well").innerHTML += ' '+s.form.warning+'<br>';
         $('#warning-well').show();
     },

     getJsPsychPreview: function() {

         // pass the trial parametrs to jsPsych and display
         jsPsych.init({
                 timeline: [s.form.userdata],
                 display_element: 'jspsych-target', 
                 on_finish: function() {
                     jsPsych.data.displayData('json');
                 }
        });
     }
 };

Playground.init();




