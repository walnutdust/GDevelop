const initializeGDevelopJs = require('../../Binaries/embuild/GDevelop.js/libGD.js');

describe('libGD.js - GDJS related tests', function() {
  let gd = null;
  beforeAll((done) => (initializeGDevelopJs().then(module => {
    gd = module;
    done();
  })));

  describe('EventsCodeGenerator', function() {
    it('can generate code for a layout with generateSceneEventsCompleteCode', function() {
      const project = gd.ProjectHelper.createNewGDJSProject();
      const layout = project.insertNewLayout('Scene', 0);

      // Create a repeat event with a trigger once
      const evt = layout
        .getEvents()
        .insertNewEvent(project, 'BuiltinCommonInstructions::Repeat', 0);
      gd.asRepeatEvent(evt).setRepeatExpression('5+4+3+2+1');
      const condition = new gd.Instruction();
      condition.setType('BuiltinCommonInstructions::Once');
      gd.asRepeatEvent(evt)
        .getConditions()
        .insert(condition, 0);

      const code = gd.EventsCodeGenerator.generateSceneEventsCompleteCode(
        project,
        layout,
        layout.getEvents(),
        new gd.SetString(),
        true
      );

      // The loop is using a counter somewhere
      expect(code).toMatch('repeatCount');

      // Trigger once is used in a condition
      expect(code).toMatch('runtimeScene.getOnceTriggers().triggerOnce');

      condition.delete();
    });

    it('can generate code for a layout with generateEventsFunctionCode', function() {
      const project = new gd.ProjectHelper.createNewGDJSProject();

      const includeFiles = new gd.SetString();
      const eventsFunction = new gd.EventsFunction();

      // Create a function accepting 4 parameters:
      const parameters = eventsFunction.getParameters();
      const parameter1 = new gd.ParameterMetadata();
      parameter1.setType('objectList');
      parameter1.setName('MyObject');
      parameter1.setDescription('The first object to be used');
      const parameter2 = new gd.ParameterMetadata();
      parameter2.setType('expression');
      parameter2.setName('MyNumber');
      parameter2.setDescription('Some number');
      const parameter3 = new gd.ParameterMetadata();
      parameter3.setType('objectList');
      parameter3.setName('MySprite');
      parameter3.setDescription('The second object to be used, a sprite');
      parameter3.setExtraInfo('Sprite');
      const parameter4 = new gd.ParameterMetadata();
      parameter4.setType('string');
      parameter4.setName('MyString');
      parameter4.setDescription('Some string');
      parameters.push_back(parameter1);
      parameters.push_back(parameter2);
      parameters.push_back(parameter3);
      parameters.push_back(parameter4);

      // Create a repeat event with...
      const eventsList = eventsFunction.getEvents();

      const evt = eventsList.insertNewEvent(
        project,
        'BuiltinCommonInstructions::Repeat',
        0
      );
      gd.asRepeatEvent(evt).setRepeatExpression('5+4+3+2+1');

      // ...a trigger once condition...
      const condition = new gd.Instruction();
      condition.setType('BuiltinCommonInstructions::Once');
      gd.asRepeatEvent(evt)
        .getConditions()
        .insert(condition, 0);

      // ...and an action to update a variable of MyObject
      const action = new gd.Instruction();
      action.setType('ModVarObjet');
      action.setParametersCount(4);
      action.setParameter(0, 'MyObject');
      action.setParameter(1, 'ObjectVariable');
      action.setParameter(2, '+');
      action.setParameter(3, '42');
      gd.asRepeatEvent(evt)
        .getActions()
        .insert(action, 0);

      const action2 = new gd.Instruction();
      action2.setType('ModVarObjet');
      action2.setParametersCount(4);
      action2.setParameter(0, 'MyObject');
      action2.setParameter(1, 'ObjectVariable2');
      action2.setParameter(2, '=');
      action2.setParameter(
        3,
        'GetArgumentAsNumber("MyNumber") + ToNumber(GetArgumentAsString("MyString"))'
      );
      gd.asRepeatEvent(evt)
        .getActions()
        .insert(action2, 1);

      const namespace = 'gdjs.eventsFunction.myTest';
      const code = gd.EventsCodeGenerator.generateEventsFunctionCode(
        project,
        eventsFunction,
        namespace,
        includeFiles,
        true
      );

      // Check that the function name is properly generated
      expect(code).toMatch(namespace + '.func = function(');

      // Check that the context for the events function is here...
      expect(code).toMatch('function(runtimeScene, eventsFunctionContext)');
      expect(code).toMatch('var eventsFunctionContext =');

      // Check that the parameters, with the (optional) context of the parent function,
      // are all here
      expect(code).toMatch(
        'function(runtimeScene, MyObject, MyNumber, MySprite, MyString, parentEventsFunctionContext)'
      );

      // ...and objects should be able to get queried...
      expect(code).toMatch('"MyObject": MyObject');
      expect(code).toMatch('"MySprite": MySprite');

      // ...and arguments should be able to get queried too:
      expect(code).toMatch('if (argName === "MyNumber") return MyNumber;');
      expect(code).toMatch('if (argName === "MyString") return MyString;');

      // GetArgumentAsString("MyString") should be generated code to query and cast as a string
      // the argument
      expect(code).toMatch(
        '(typeof eventsFunctionContext !== \'undefined\' ? "" + eventsFunctionContext.getArgument("MyString") : "")'
      );

      // GetArgumentAsNumber("MyNumber") should be generated code to query and cast as a string
      // the argument
      expect(code).toMatch(
        '(typeof eventsFunctionContext !== \'undefined\' ? Number(eventsFunctionContext.getArgument("MyNumber")) || 0 : 0)'
      );

      // The loop is using a counter somewhere
      expect(code).toMatch('repeatCount');

      // Trigger once is used in a condition
      expect(code).toMatch('runtimeScene.getOnceTriggers().triggerOnce');

      // A variable have 42 added to it
      expect(code).toMatch('getVariables().get("ObjectVariable")).add(42)');

      condition.delete();
      action.delete();
    });
    it('can generate code for a layout with generateEventsFunctionCode, with groups', function() {
      const project = new gd.ProjectHelper.createNewGDJSProject();

      const includeFiles = new gd.SetString();
      const eventsFunction = new gd.EventsFunction();

      // Create a function accepting 2 parameters:
      const parameters = eventsFunction.getParameters();
      const parameter1 = new gd.ParameterMetadata();
      parameter1.setType('objectList');
      parameter1.setName('MyObject');
      parameter1.setDescription('The first object to be used');
      const parameter2 = new gd.ParameterMetadata();
      parameter2.setType('objectList');
      parameter2.setName('MySprite');
      parameter2.setDescription('The second object to be used, a sprite');
      parameter2.setExtraInfo('Sprite');
      parameters.push_back(parameter1);
      parameters.push_back(parameter2);

      // And with a group:
      const group = eventsFunction.getObjectGroups().insertNew('MyGroup', 0);
      group.addObject('MyObject');
      group.addObject('MySprite');

      // Create a repeat event with...
      const eventsList = eventsFunction.getEvents();

      const evt = eventsList.insertNewEvent(
        project,
        'BuiltinCommonInstructions::Repeat',
        0
      );
      gd.asRepeatEvent(evt).setRepeatExpression('5+4+3+2+1');

      // ...an action to update a variable of the group of objects
      const action = new gd.Instruction();
      action.setType('ModVarObjet');
      action.setParametersCount(4);
      action.setParameter(0, 'MyGroup');
      action.setParameter(1, 'ObjectVariable');
      action.setParameter(2, '+');
      action.setParameter(3, '42');
      gd.asRepeatEvent(evt)
        .getActions()
        .insert(action, 0);

      const namespace = 'gdjs.eventsFunction.myTest';
      const code = gd.EventsCodeGenerator.generateEventsFunctionCode(
        project,
        eventsFunction,
        namespace,
        includeFiles,
        true
      );

      // Check that the function name is properly generated
      expect(code).toMatch(namespace + '.func = function(');

      // Check that the context for the events function is here...
      expect(code).toMatch('function(runtimeScene, eventsFunctionContext)');
      expect(code).toMatch('var eventsFunctionContext =');

      // Check that the parameters, with the (optional) context of the parent function,
      // are all here
      expect(code).toMatch(
        'function(runtimeScene, MyObject, MySprite, parentEventsFunctionContext)'
      );

      // ...and objects should be able to get queried...
      expect(code).toMatch('"MyObject": MyObject');
      expect(code).toMatch('"MySprite": MySprite');

      // Variables of both MyObject and MySprite should have 42 added:
      expect(code).toMatch(
        'GDMyObjectObjects2[i].getVariables().get("ObjectVariable")).add(42)'
      );
      expect(code).toMatch(
        'GDMySpriteObjects2[i].getVariables().get("ObjectVariable")).add(42)'
      );

      action.delete();
    });
  });

  const testObjectFeatures = object => {
    expect(object instanceof gd.Object).toBe(true);
    object.setTags('tag1, tag2, tag3');
    expect(object.getTags()).toBe('tag1, tag2, tag3');
    expect(object.getVariables()).toBeTruthy();
  };

  describe('TextObject', function() {
    it('should expose TextObject specific methods', function() {
      var object = new gd.TextObject('MyTextObject');
      testObjectFeatures(object);
      object.setString('Hello');
      object.setFontName('Hello.ttf');
      object.setCharacterSize(10);
      object.setBold(true);
      object.setColor(1, 2, 3);

      expect(object.getString()).toBe('Hello');
      expect(object.getFontName()).toBe('Hello.ttf');
      expect(object.getCharacterSize()).toBe(10);
      expect(object.isBold()).toBe(true);
      expect(object.getColorR()).toBe(1);
      expect(object.getColorG()).toBe(2);
      expect(object.getColorB()).toBe(3);
    });
  });
  describe('TiledSpriteObject', function() {
    it('should expose TiledSpriteObject specific methods', function() {
      var object = new gd.TiledSpriteObject('MyTiledSpriteObject');
      testObjectFeatures(object);
      object.setTexture('MyImageName');
      expect(object.getTexture()).toBe('MyImageName');
    });
  });
  describe('PanelSpriteObject', function() {
    it('should expose PanelSpriteObject specific methods', function() {
      var object = new gd.PanelSpriteObject('MyPanelSpriteObject');
      testObjectFeatures(object);
      object.setTexture('MyImageName');
      expect(object.getTexture()).toBe('MyImageName');
    });
  });
  describe('ShapePainterObject', function() {
    it('should expose ShapePainterObject specific methods', function() {
      var object = new gd.ShapePainterObject('MyShapePainterObject');
      testObjectFeatures(object);
      object.setCoordinatesAbsolute();
      expect(object.areCoordinatesAbsolute()).toBe(true);
      object.setCoordinatesRelative();
      expect(object.areCoordinatesAbsolute()).toBe(false);
    });
  });
  describe('TextEntryObject', function() {
    it('should expose TextEntryObject', function() {
      var object = new gd.TextEntryObject('MyTextEntryObject');
      testObjectFeatures(object);
    });
  });
  describe('ParticleEmitterObject', function() {
    it('should expose ParticleEmitterObject', function() {
      var object = new gd.ParticleEmitterObject('MyParticleEmitterObject');
      testObjectFeatures(object);
    });
  });
  describe('JsCodeEvent', function() {
    it('can store its code', function() {
      var event = new gd.JsCodeEvent();
      event.setInlineCode('console.log("Hello world");');
      expect(event.getInlineCode()).toBe('console.log("Hello world");');
    });
    it('can store the objects to pass as parameter', function() {
      var event = new gd.JsCodeEvent();
      event.setParameterObjects('MyObject');
      expect(event.getParameterObjects()).toBe('MyObject');
    });
    it('can be cloned', function() {
      var event = new gd.JsCodeEvent();
      event.setInlineCode('console.log("Hello world 2");');
      event.setParameterObjects('MyObject2');

      var cloneEvent = event.clone();
      expect(cloneEvent.getParameterObjects()).toBe('MyObject2');
      expect(cloneEvent.getInlineCode()).toBe('console.log("Hello world 2");');
    });
  });
});
