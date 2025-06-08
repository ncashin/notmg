export type Entity = number;
export type ComponentTypeString = string;
export type Component = { type: ComponentTypeString } & Record<string, unknown>;
export type ECSInstance = {
  entityIDCounter: number;
  componentPools: Record<ComponentTypeString, Record<Entity, Component>>;
  composedPools: Record<ComponentTypeString, Record<Entity, Component[]>>;
  associatedComposedPoolKeys: Record<ComponentTypeString, string[]>;

  addComponentCallback?: (entity: Entity, component: Component) => void;
  removeComponentCallback?: (
    entity: Entity,
    COMPONENT_TYPE_DEF: Component,
  ) => void;
  destroyEntityCallback?: (entity: Entity) => void;

  componentProxyHandler?: ComponentProxyHandler;
};

export type ComponentProxyHandler = {
  set: (
    entity: Entity,
    component: Component,
    property: string,
    newValue: unknown,
  ) => boolean;
};

export type ECSInstanceCreateInfo = {
  addComponentCallback?: (entity: Entity, component: Component) => void;
  removeComponentCallback?: (
    entity: Entity,
    COMPONENT_TYPE_DEF: Component,
  ) => void;
  destroyEntityCallback?: (entity: Entity) => void;
  componentProxyHandler?: ComponentProxyHandler;
};

export const createECSInstance = (
  ecsInstanceCreateInfo: ECSInstanceCreateInfo,
): ECSInstance => ({
  entityIDCounter: 0,
  componentPools: {},
  composedPools: {},
  associatedComposedPoolKeys: {},

  ...ecsInstanceCreateInfo,
});

export const createEntity = (instance: ECSInstance): Entity => {
  return instance.entityIDCounter++;
};
export const destroyEntity = (instance: ECSInstance, entity: Entity) => {
  for (const composedPool of Object.values(instance.componentPools)) {
    if (composedPool[entity] !== undefined) {
      delete composedPool[entity];
    }
  }
  for (const composedPool of Object.values(instance.composedPools)) {
    if (composedPool[entity] !== undefined) {
      delete composedPool[entity];
    }
  }

  if (instance.destroyEntityCallback) {
    instance.destroyEntityCallback(entity);
  }
};

const lookupComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType,
) => {
  return lookupComponentPool(instance, COMPONENT_TYPE_DEF.type)[
    entity
  ] as ComponentType;
};
const lookupComponentPool = (
  instance: ECSInstance,
  componentType: ComponentTypeString,
) => {
  if (instance.componentPools[componentType] === undefined) {
    instance.componentPools[componentType] = {};
  }
  return instance.componentPools[componentType];
};
const createComponentReference = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType,
) => {
  if (instance.componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
    instance.componentPools[COMPONENT_TYPE_DEF.type] = {};
  }
  instance.componentPools[COMPONENT_TYPE_DEF.type][entity] =
    structuredClone(COMPONENT_TYPE_DEF);
};
const lookupAssociatedComposedPoolKeys = <ComponentType extends Component>(
  instance: ECSInstance,
  COMPONENT_TYPE_DEF: ComponentType,
) => {
  if (
    instance.associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type] === undefined
  ) {
    instance.associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type] = [];
  }
  return instance.associatedComposedPoolKeys[COMPONENT_TYPE_DEF.type];
};

export const createComponentProxy = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType,
) => {
  const component = lookupComponent(instance, entity, COMPONENT_TYPE_DEF);
  if (!component) return undefined;
  return new Proxy(component, {
    set: (target, property, newValue, _receiver) => {
      if (typeof property !== "string") {
        throw new Error("property is not a string");
      }

      if (instance.componentProxyHandler === undefined) {
        throw new Error("componentProxyHandler is undefined");
      }

      return instance.componentProxyHandler.set(
        entity,
        target,
        property,
        newValue,
      );
    },
  });
};

export const getComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType,
): ComponentType | undefined => {
  if (instance.componentProxyHandler !== undefined) {
    return createComponentProxy(instance, entity, COMPONENT_TYPE_DEF);
  }
  return lookupComponent(instance, entity, COMPONENT_TYPE_DEF);
};
export const addComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType,
) => {
  createComponentReference(instance, entity, COMPONENT_TYPE_DEF);
  for (const keyToUpdate of lookupAssociatedComposedPoolKeys(
    instance,
    COMPONENT_TYPE_DEF,
  )) {
    const parsedKeyComponentTypes = keyToUpdate.split(" ");
    const composedComponents = [];
    for (let i = 0; i < parsedKeyComponentTypes.length; i++) {
      const component = lookupComponent(instance, entity, {
        type: parsedKeyComponentTypes[i],
      });
      if (component === undefined) continue;
      composedComponents.push(component);
    }
    if (composedComponents.length === parsedKeyComponentTypes.length) {
      instance.composedPools[keyToUpdate][entity] = composedComponents;
    }
  }
  if (instance.addComponentCallback) {
    instance.addComponentCallback(
      entity,
      lookupComponent(instance, entity, COMPONENT_TYPE_DEF),
    );
  }
};
export const removeComponent = <ComponentType extends Component>(
  instance: ECSInstance,
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType,
) => {
  for (const keyToUpdate of lookupAssociatedComposedPoolKeys(
    instance,
    COMPONENT_TYPE_DEF,
  )) {
    if (instance.composedPools[keyToUpdate][entity] !== undefined) {
      delete instance.composedPools[keyToUpdate][entity];
    }
  }
  if (instance.removeComponentCallback) {
    instance.removeComponentCallback(entity, COMPONENT_TYPE_DEF);
  }
  delete lookupComponentPool(instance, COMPONENT_TYPE_DEF.type)[entity];
};

export const queryComponents = <const ComposedType extends Component[]>(
  instance: ECSInstance,
  COMPONENT_TYPE_DEFS: ComposedType,
) => {
  const combination = COMPONENT_TYPE_DEFS.map(
    (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type,
  ).reduce((previous, current) => `${previous} ${current}`);

  // early return if composed pool already exists
  if (instance.composedPools[combination] !== undefined) {
    return instance.composedPools[combination];
  }

  const poolComponents: Record<Entity, Component[]> = {};
  const componentTypes = COMPONENT_TYPE_DEFS.map(
    (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type,
  );

  for (const COMPONENT_TYPE_DEF of COMPONENT_TYPE_DEFS) {
    lookupAssociatedComposedPoolKeys(instance, COMPONENT_TYPE_DEF).push(
      combination,
    );
  }

  const componentPool = lookupComponentPool(instance, componentTypes[0]);

  for (const [entityID, component] of Object.entries(componentPool)) {
    const composedComponents = [component];
    for (let i = 1; i < componentTypes.length; i++) {
      const component = lookupComponent(instance, Number(entityID), {
        type: componentTypes[i],
      });
      if (component === undefined) break;
      composedComponents.push(component);
    }

    if (composedComponents.length < componentTypes.length) {
      continue;
    }
    poolComponents[Number(entityID)] = composedComponents;
  }
  instance.composedPools[combination] = poolComponents;
  return instance.composedPools[combination] as Record<number, ComposedType>;
};

export const runQuery = <const ComposedType extends Component[]>(
  instance: ECSInstance,
  COMPONENT_TYPE_DEFS: ComposedType,
  lambda: (entity: Entity, components: ComposedType) => void,
) => {
  for (const [entity, components] of Object.entries(
    queryComponents(instance, COMPONENT_TYPE_DEFS),
  )) {
    if (instance.componentProxyHandler) {
      const componentProxies = components.map((component) =>
        createComponentProxy(instance, Number.parseInt(entity), component),
      ) as ComposedType;
      lambda(Number.parseInt(entity), componentProxies);
    }

    lambda(Number.parseInt(entity), components as unknown as ComposedType);
  }
};

export const curryECSInstance = (instance: ECSInstance) => ({
  ecsInstance: instance,

  createEntity: (): Entity => createEntity(instance),
  destroyEntity: (entity: Entity) => destroyEntity(instance, entity),

  addComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType,
  ) => addComponent(instance, entity, COMPONENT_TYPE_DEF),
  removeComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType,
  ) => removeComponent(instance, entity, COMPONENT_TYPE_DEF),

  getComponent: <ComponentType extends Component>(
    entity: Entity,
    COMPONENT_TYPE_DEF: ComponentType,
  ): ComponentType | undefined =>
    getComponent(instance, entity, COMPONENT_TYPE_DEF),
  queryComponents: <const ComposedType extends Component[]>(
    COMPONENT_TYPE_DEFS: ComposedType,
  ) => queryComponents(instance, COMPONENT_TYPE_DEFS),

  runQuery: <const ComposedType extends Component[]>(
    COMPONENT_TYPE_DEFS: ComposedType,
    lambda: (entity: Entity, components: ComposedType) => void,
  ) => runQuery(instance, COMPONENT_TYPE_DEFS, lambda),
});

export const provideECSInstanceFunctions = (
  ecsInstanceCreateInfo?: ECSInstanceCreateInfo,
) => {
  const ecsInstance = createECSInstance(ecsInstanceCreateInfo ?? {});

  return curryECSInstance(ecsInstance);
};
