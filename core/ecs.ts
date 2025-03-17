type Entity = number;
let ENTITY_ID = 0;

type Component = { type: string };
let componentPools: Record<string, Component[]> = {};
let composedPools: Record<string, Component[][]> = {};

let associatedComposedPoolKeys: Record<string, string[]> = {};

export const createEntity = (): Entity => {
  return ENTITY_ID++;
};

const lookupComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  if (componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
    componentPools[COMPONENT_TYPE_DEF.type] = [];
  }
  return componentPools[COMPONENT_TYPE_DEF.type][entity] as ComponentType;
};
const createComponentReference = <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType
  ) => {
    if (componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
      componentPools[COMPONENT_TYPE_DEF.type] = [];
    }
    componentPools[COMPONENT_TYPE_DEF.type][entity] = structuredClone(COMPONENT_TYPE_DEF);
  };
const lookupAssociatedComposedPoolKeys = <ComponentType extends Component>(
  COMPONENT_TYPE_DEF: ComponentType
) => {
  if (associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type] === undefined) {
    associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type] = [];
  }
  return associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type];
};

export const getComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
): ComponentType => {
  return lookupComponent(entity, COMPONENT_TYPE_DEF);
};
export const addComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  createComponentReference(entity, COMPONENT_TYPE_DEF);

  lookupAssociatedComposedPoolKeys(COMPONENT_TYPE_DEF).forEach(
    (keyToUpdate) => {
      const parsedKeyComponentTypes = keyToUpdate.split(" ");
      let composedComponents = [];
      for (let i = 0; i < parsedKeyComponentTypes.length; i++) {
        let component = lookupComponent(entity, {
          type: parsedKeyComponentTypes[i],
        });
        if (component === undefined) return;
        composedComponents.push(component);
      }
      composedPools[keyToUpdate][entity] = composedComponents;
    }
  );
};
export const removeComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  lookupAssociatedComposedPoolKeys(COMPONENT_TYPE_DEF).forEach(
    (keyToUpdate) => {
      delete composedPools[keyToUpdate][entity];
    }
  );
  delete componentPools[COMPONENT_TYPE_DEF.type][entity];
};

export const queryEntities = <const ComposedType extends Component[]>(
  COMPONENT_TYPE_DEFS: ComposedType,
  lambda: (arg0: ComposedType) => void
) => {
  if (COMPONENT_TYPE_DEFS.length == 1) {
  }

  const combination = COMPONENT_TYPE_DEFS.map(
    (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type
  ).reduce((previous, current) => previous + " " + current);

  if (composedPools[combination] === undefined) {
    let poolComponents: Component[][] = [];

    // This can be fixed so that not all entities need to be looped through this is for testing
    for (let entityID = 0; entityID < ENTITY_ID; entityID++) {
      const componentTypes = COMPONENT_TYPE_DEFS.map(
        (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type
      );
      let composedComponents = [];
      for (let i = 0; i < componentTypes.length; i++) {
        let component = lookupComponent(entityID, {
          type: componentTypes[i],
        });
        if (component === undefined) break;
        composedComponents.push(component);
      }

      if (composedComponents.length < componentTypes.length) {
        continue;
      }
      poolComponents[entityID] = composedComponents;

      COMPONENT_TYPE_DEFS.forEach((COMPONENT_TYPE_DEF) => {
        lookupAssociatedComposedPoolKeys(COMPONENT_TYPE_DEF).push(combination);
      });
    }
    composedPools[combination] = poolComponents;
  }

  composedPools[combination].forEach((composedComponents) => {
    lambda(composedComponents as ComposedType);
  });
};
