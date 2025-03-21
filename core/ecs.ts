type Entity = number;
type ComponentTypeString = string;
type Component = { type: ComponentTypeString };
export type ECSInstance = {
  entityIDCounter: number;
  componentPools: Record<ComponentTypeString, Record<Entity, Component>>;
  composedPools: Record<ComponentTypeString, Record<Entity, Component[]>>;
  associatedComposedPoolKeys: Record<ComponentTypeString, string[]>;
};

export const createECSInstance = () => ({
  entityIDCounter: 0,
  componentPools: {},
  composedPools: {},
  associatedComposedPoolKeys: {},
});

export const createEntity = (instance: ECSInstance): Entity => {
  return instance.entityIDCounter++;
};
export const destroyEntity = (instance: ECSInstance, entity: Entity) => {
  Object.values(instance.componentPools).forEach((composedPool) => {
    if (composedPool[entity] !== undefined) {
      delete composedPool[entity];
    }
  });
  Object.values(instance.composedPools).forEach((composedPool) => {
    if (composedPool[entity] !== undefined) {
      delete composedPool[entity];
    }
  });
};

const lookupComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  return lookupComponentPool(instance, COMPONENT_TYPE_DEF.type)[
    entity
  ] as ComponentType;
};
const lookupComponentPool = (
  instance: ECSInstance,
  componentType: ComponentTypeString
) => {
  if (instance.componentPools[componentType] === undefined) {
    instance.componentPools[componentType] = {};
  }
  return instance.componentPools[componentType];
};
const createComponentReference = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  if (instance.componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
    instance.componentPools[COMPONENT_TYPE_DEF.type] = {};
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
      if (instance.composedPools[keyToUpdate][entity] !== undefined) {
        delete instance.composedPools[keyToUpdate][entity];
      }
    }
  );
  delete lookupComponentPool(instance, COMPONENT_TYPE_DEF.type)[entity];
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

  let poolComponents: Record<Entity, Component[]> = {};
  // This can be fixed so that not all entities need to be looped through this is for testing
  const componentTypes = COMPONENT_TYPE_DEFS.map(
    (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type
  );
  let componentPool = lookupComponentPool(instance, componentTypes[0]);
  for (let [entityID, component] of Object.entries(componentPool)) {
    let composedComponents = [component];
    for (let i = 1; i < componentTypes.length; i++) {
      let component = lookupComponent(instance, entityID as any as number, {
        type: componentTypes[i],
      });
      if (component === undefined) break;
      composedComponents.push(component);
    }

    if (composedComponents.length < componentTypes.length) {
      continue;
    }
    poolComponents[entityID as any as number] = composedComponents;

    COMPONENT_TYPE_DEFS.forEach((COMPONENT_TYPE_DEF) => {
      lookupAssociatedComposedPoolKeys(instance, COMPONENT_TYPE_DEF).push(
        combination
      );
    });
  }
  instance.composedPools[combination] = poolComponents;
  return instance.composedPools[combination] as Record<number, ComposedType>;
};

export const runSystem = <const ComposedType extends Component[]>(
  instance: ECSInstance,
  COMPONENT_TYPE_DEFS: ComposedType,
  lambda: (entity: Entity, components: ComposedType) => void
) => {
  Object.entries(queryComponents(instance, COMPONENT_TYPE_DEFS)).forEach(
    ([entity, components]) =>
      lambda(Number.parseInt(entity), components as any as ComposedType)
  );
};

export const curryECSInstance = (instance: ECSInstance) => ({
  ecsInstance: instance,

  createEntity: (): Entity => createEntity(instance),
  destroyEntity: (entity: Entity) => destroyEntity(instance, entity),

  addComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType
  ) => addComponent(instance, entity, COMPONENT_TYPE_DEF),
  removeComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType
  ) => removeComponent(instance, entity, COMPONENT_TYPE_DEF),

  getComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType
  ): ComponentType => getComponent(instance, entity, COMPONENT_TYPE_DEF),
  queryComponents: <const ComposedType extends Component[]>(
    COMPONENT_TYPE_DEFS: ComposedType
  ) => queryComponents(instance, COMPONENT_TYPE_DEFS),

  runSystem: <const ComposedType extends Component[]>(
    COMPONENT_TYPE_DEFS: ComposedType,
    lambda: (entity: Entity, components: ComposedType) => void
  ) => runSystem(instance, COMPONENT_TYPE_DEFS, lambda),
});

export const provideECSInstanceFunctions = () => {
  return curryECSInstance(createECSInstance());
};
