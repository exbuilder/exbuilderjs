// javascript to control the playground UI
var s, 
 Playground = {
     settings: {
         pluginList: "holds the list of plugins updated by fetchPlugins(release)",
         selectedPlugin: "holds the user selected plugin",
         selectedJsPsychRelease: "holds the jsPsych release the user selected",
         buttons: {
             meta: "holds the buttons we use in the playground",
             pluginSelector: $('#pluginSelector'),
             jsPsychReleaseSelector: $('#jsPsychReleaseSelector'),
             previewButton: $('#previewButton')
         },
         targets: {
             meta: "holds the html targets we use in the playground",
             warning_well: "#warning-well",
             selected_plugin: "#pluginSelector option:selected",
             plugin_name: "plugin-name",
             plugin_description: "plugin-description",
             plugin_docs: "plugin-docs",
             parameter_well: "#parameter-well",
             parameter_form: "#parameter-form"
         },
         form: {
             defaults: "holds the defaults of the curretly selected plugin, used to populate the form",
             userdata: "holds the user input to the form",
             warning: "holds the warning text updated by the validateUserData()",
             orders: {
                 labelfirst: ['div', 'label', 'input', 'small'],
                 inputfirst: ['div', 'input', 'label', 'small']
             } 
         }
     },

     init: function() {
         s = this.settings; 

         // initialize playground by hiding the warning well and binding UI actions
         $('#warning-well').hide();
         this.bindUIActions();
     },

     bindUIActions: function(){

         s.buttons.pluginSelector.on('change', function() {
             // get the selected plugin
             var name = $( "#pluginSelector option:selected" ).text();
             s.selectedPlugin = s.pluginList[name];
             console.log("user selected plugin", s.selectedPlugin.name, "...");

             document.getElementById(s.targets.plugin_name).innerHTML =s.selectedPlugin.name;
             document.getElementById(s.targets.plugin_description).innerHTML = s.selectedPlugin.description;
             document.getElementById(s.targets.plugin_docs).href = s.selectedPlugin.docs;

             // get the parameters for this plugin
             Playground.getPluginParams();
         }),

         s.buttons.previewButton.on('click', function(){

             // clear the error well
             $('#warning-well').hide();
             $('#warning-well').empty();
             // get the form data the user has entered
             console.log("preview button clicked... " );

             Playground.getFormData();
         });

     },

     fetchPlugins: function(release){
         // we need to pass the user's selected version to our playground js
         // and then fetch the plugins from exbuilder/plugins on
        fetch('https://exbuilder.github.io/jspsych-plugins/'+release+'.json')
            .then(response => response.json())
            .then(data => {
                s.pluginList = data.plugins;
                console.log("fetching plugins for jspsych release "+release, s.pluginList);
            });

     },

     getPluginParams: function() {

        console.log("getting parameters for this plugin...");


         // clear the parameter form and the data we were holding
         document.getElementById("parameterForm").reset();

         // set the form defaults to the newly selected plugin parameters
         s.form.defaults = s.selectedPlugin.parameters
         s.form.userdata = {};
         
         // then get the new plugin parameters
         this.stringifyArrays();
     },

     stringifyArrays: function() {
         console.log("stringifying arrays...");

         // for every parameter object in our defaults
         s.form.defaults.forEach(
             (parameter, index) => {
                 // check if the value of the key is an array; if yes, stringify
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
         // first you want to empty the well that holds the form groups
         $("#parameter-well").empty();

         // then, for each parameter, make the form group
         console.log("generating the form...");
         s.form.defaults.forEach(
         
             (parameter, index) => 
             {
                 this.makeFormGroup(parameter, index);
             }
         );  

         // once the form is built, get the form's default data so we can generate the preview window
         this.getFormData();
     },
     makeFormGroup: function(parameter, index) {

         // this is the biggest function; it's doing a lot of things, which I don't love.
         // Basically, for every parameter of the plugin, it generates the HTML form
         // console.log("generating form group for", parameter.name, "...");
                 
         const form_group = s.form.orders.labelfirst;
         
         form_group.forEach( 

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

                         // if we are making a div, we'll add an in with an idex
                         el.id = 'form-div-'+index
                         break;

                     case "label":
                         el.className += 'form-control-label'

                         // if we are making a label, we need to add for and innerHTML
                         el.for = parameter.name;
                         el.innerHTML = parameter.pretty_name;
                         break;

                     case "input":
                         el.className += ' form-control form-control-sm'

                         // if making an input, we need id, name, value, placeholder and type 
                         el.id = parameter.name;
                         el.name = parameter.name;
                         el.value = parameter.default;
                         el.placeholder = parameter.default;
                         el.type = "text";
                         break;

                     case "small":
                         el.className += ' form-text text-muted'

                         // if making a description, we need to id and innerHTML
                         el.id = parameter.name;
                         el.innerHTML = parameter.description;
                         break;

                 };

                 // when we're done, we want to append the child to the right target
                 // if it's the div, we should use the parameter-well; otherwise append it to this index's div
                 const target = (type === 'div') ? 'parameter-well' : 'form-div-'+index;
                 document.getElementById(target).appendChild(el);
             }
                 
         )
     },

     getFormData: function() {

         // here we're going to get the form data 
         console.log("getting data from form...");
         var form = document.querySelector('#parameterForm');
         var data = new FormData(form);

         // and then we want to parse some of the JSON fields
         this.parseFormData(data);
     },

     parseFormData: function(data){

         // here we're parsing JSON values but only if we need to
         console.log("parsing data from form...");
         data.forEach((value, key) => {
             try {
                 s.form.userdata[key] = JSON.parse(value);
             } catch (error) {
                 s.form.userdata[key] = value;
             }

         });

         // now that it's parsed, let's validate it
         this.validateUserData();
         

     },
     validateUserData: function(){

         // give users some helpful hints if they're trying to enter
         // stuff that won't work in jsPsych
         console.log("validating user input...");
         console.log(s.form.userdata);
         
         for (const [key, value] of Object.entries(s.form.userdata)) {
             
             // start out with is_valid as false and get the current parameter by name
             var is_valid = false;
             var parameter = s.form.defaults.find(x => x.name === key);
             console.log(parameter.type);

             switch (parameter.type) {
                 case "numeric":
                     // if it's not a number, then it's not valid
                     is_valid = !(isNaN(value)) 
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

         // then show the preview; if fields are not valid, you can still
         // pass to jsPsych so user can debug.
         this.getJsPsychPreview();
     },
     showValidationError: function(warning){

         console.log("Oops, user made a mistake. Showing warnings...");

         // Update the waring well with 
         let warning_well = document.getElementById('warning-well');
         warning_well.innerHTML += ' '+s.form.warning+'<br>';

         // then show it
         $('#warning-well').show();

     },

 
     getJsPsychPreview: function() {

         console.log("loading jsPsych preview...", s.form.userdata);

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




