type Entity = number;
let ENTITY_ID = 0;

export type ECSInstance = {
  entityIDCounter: number;
  componentPools: Record<string, Component[]>;
  composedPools: Record<string, Component[][]>;
  associatedComposedPoolKeys: Record<string, string[]>;
};

export const createECSInstance = () => ({
  componentPools: {},
  composedPools: {},
  associatedComposedPoolKeys: {},
});

type Component = { type: string };

export const createEntity = (instance: ECSInstance): Entity => {
  return instance.entityIDCounter++;
};
export const destroyEntity = (instance: ECSInstance, entity: Entity) => {
  Object.values(instance.componentPools).forEach((composedPool) => {
    delete composedPool[entity];
  });
  Object.values(instance.composedPools).forEach((composedPool) => {
    delete composedPool[entity];
  });
};

const lookupComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  if (instance.componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
    instance.componentPools[COMPONENT_TYPE_DEF.type] = [];
  }
  return instance.componentPools[COMPONENT_TYPE_DEF.type][
    entity
  ] as ComponentType;
};
const createComponentReference = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  if (instance.componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
    instance.componentPools[COMPONENT_TYPE_DEF.type] = [];
  }
  instance.componentPools[COMPONENT_TYPE_DEF.type][entity] =
    structuredClone(COMPONENT_TYPE_DEF);
};
const lookupAssociatedComposedPoolKeys = <ComponentType extends Component>(
  instance: ECSInstance,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  if (
    instance.associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type] === undefined
  ) {
    instance.associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type] = [];
  }
  return instance.associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type];
};

export const getComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
): ComponentType => {
  return lookupComponent(instance, entity, COMPONENT_TYPE_DEF);
};
export const addComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  createComponentReference(instance, entity, COMPONENT_TYPE_DEF);

  lookupAssociatedComposedPoolKeys(instance, COMPONENT_TYPE_DEF).forEach(
    (keyToUpdate) => {
      const parsedKeyComponentTypes = keyToUpdate.split(" ");
      let composedComponents = [];
      for (let i = 0; i < parsedKeyComponentTypes.length; i++) {
        let component = lookupComponent(instance, entity, {
          type: parsedKeyComponentTypes[i],
        });
        if (component === undefined) return;
        composedComponents.push(component);
      }
      instance.composedPools[keyToUpdate][entity] = composedComponents;
    }
  );
};
export const removeComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  lookupAssociatedComposedPoolKeys(instance, COMPONENT_TYPE_DEF).forEach(
    (keyToUpdate) => {
      delete instance.composedPools[keyToUpdate][entity];
    }
  );
  delete instance.componentPools[COMPONENT_TYPE_DEF.type][entity];
};

export const queryComponents = <const ComposedType extends Component[]>(
  instance: ECSInstance,
  COMPONENT_TYPE_DEFS: ComposedType
) => {
  const combination = COMPONENT_TYPE_DEFS.map(
    (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type
  ).reduce((previous, current) => previous + " " + current);

  // early return if composed pool already exists
  if (instance.composedPools[combination] !== undefined) {
    return instance.composedPools[combination];
  }

  let poolComponents: Component[][] = [];
  // This can be fixed so that not all entities need to be looped through this is for testing
  for (let entityID = 0; entityID < ENTITY_ID; entityID++) {
    const componentTypes = COMPONENT_TYPE_DEFS.map(
      (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type
    );
    let composedComponents = [];
    for (let i = 0; i < componentTypes.length; i++) {
      let component = lookupComponent(instance, entityID, {
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
      lookupAssociatedComposedPoolKeys(instance, COMPONENT_TYPE_DEF).push(
        combination
      );
    });
  }
  instance.composedPools[combination] = poolComponents;
  return instance.composedPools[combination];
};

export const runSystemCallback = <const ComposedType extends Component[]>(
  instance: ECSInstance,
  COMPONENT_TYPE_DEFS: ComposedType,
  lambda: (entity: Entity, components: ComposedType) => void
) => {
  let queryIterator = queryComponents(instance, COMPONENT_TYPE_DEFS).entries();
  for (let [entity, components] of queryIterator) {
    lambda(entity, components as ComposedType);
  }
};

export const curryECSInstance = (instance: ECSInstance) => ({
  createEntity: (): Entity => createEntity(instance),
  destroyEntity: (entity: Entity) => destroyEntity(instance, entity),

  getComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType
  ): ComponentType => getComponent(instance, entity, COMPONENT_TYPE_DEF),

  addComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType
  ) => addComponent(instance, entity, COMPONENT_TYPE_DEF),
  removeComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType
  ) => removeComponent(instance, entity, COMPONENT_TYPE_DEF),

  queryComponents: <const ComposedType extends Component[]>(
    COMPONENT_TYPE_DEFS: ComposedType
  ) => queryComponents(instance, COMPONENT_TYPE_DEFS),

  runSystemCallback: <const ComposedType extends Component[]>(
    COMPONENT_TYPE_DEFS: ComposedType,
    lambda: (entity: Entity, components: ComposedType) => void
  ) => runSystemCallback(instance, COMPONENT_TYPE_DEFS, lambda),
});
