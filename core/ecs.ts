type Entity = number;
let ENTITY_ID = 0;

type Component = { type: string };
let componentPools: Record<string, Component[]> = {};
let composedPools: Record<string, Component[][]> = {};

let toUpdateOnChange: Record<string, string[]> = {};

export const createEntity = (): Entity => {
  return ENTITY_ID++;
};

export const getComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
): ComponentType => {
  if (componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
    componentPools[COMPONENT_TYPE_DEF.type] = [];
  }
  return componentPools[COMPONENT_TYPE_DEF.type][entity] as ComponentType;
};
export const addComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  console.log(toUpdateOnChange);

  let newComponent = structuredClone(COMPONENT_TYPE_DEF);
  if (componentPools[COMPONENT_TYPE_DEF.type] === undefined) {
    componentPools[COMPONENT_TYPE_DEF.type] = [];
  }

  componentPools[COMPONENT_TYPE_DEF.type][entity] = newComponent;

  if (toUpdateOnChange[COMPONENT_TYPE_DEF.type] === undefined) {
    toUpdateOnChange[COMPONENT_TYPE_DEF.type] = [];
  }
  toUpdateOnChange[COMPONENT_TYPE_DEF.type].forEach((keyToUpdate) => {
    const parsedKeyComponentTypes = keyToUpdate.split(" ");

    let composedComponents = parsedKeyComponentTypes.reduce(
      (composedArray, componentType) => [
        ...composedArray,
        getComponent(entity, { type: componentType }),
      ],
      [] as Component[]
    );

    if (
      composedComponents.filter((a) => a).length ===
      parsedKeyComponentTypes.length
    ) {
      composedPools[keyToUpdate][entity] = composedComponents;
    }
  });
};
export const removeComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  if (toUpdateOnChange[COMPONENT_TYPE_DEF.type] === undefined) {
    toUpdateOnChange[COMPONENT_TYPE_DEF.type] = [];
  }
  toUpdateOnChange[COMPONENT_TYPE_DEF.type].forEach((keyToUpdate) => {
    delete composedPools[keyToUpdate][entity];
  });
  delete componentPools[COMPONENT_TYPE_DEF.type][entity];
};

export const queryEntities = <ComposedType extends Component[]>(
  COMPONENT_TYPE_DEFS: ComposedType,
  lambda: (arg0: ComposedType) => void
) => {
  const combination = COMPONENT_TYPE_DEFS.map(
    (COMPONENT_TYPE_DEF) => COMPONENT_TYPE_DEF.type
  ).reduce((previous, current) => previous + " " + current);

  if (composedPools[combination] === undefined) {
    let poolComponents: Component[][] = [];
    // This can be fixed so that not all entities need to be looped through this is for testing
    for (let i = 0; i < ENTITY_ID; i++) {
      let composedComponents = COMPONENT_TYPE_DEFS.reduce(
        (composedArray, COMPONENT_TYPE_DEF) => [
          ...composedArray,
          getComponent(i, COMPONENT_TYPE_DEF),
        ],
        [] as Component[]
      );
      if (
        composedComponents.filter((a) => a).length !==
        COMPONENT_TYPE_DEFS.length
      ) {
        continue;
      }
      poolComponents[i] = composedComponents;

      COMPONENT_TYPE_DEFS.forEach((COMPONENT_TYPE_DEF) => {
        if (toUpdateOnChange[COMPONENT_TYPE_DEF.type] === undefined) {
          toUpdateOnChange[COMPONENT_TYPE_DEF.type] = [];
        }
        toUpdateOnChange[COMPONENT_TYPE_DEF.type].push(combination);
      });
    }
    composedPools[combination] = poolComponents;
  }

  composedPools[combination].forEach((composedComponents) => {
    lambda(composedComponents as ComposedType);
  });
};
