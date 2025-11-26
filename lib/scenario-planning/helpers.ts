import { ScenarioEvent } from "./index";

const makeDependency = (input: {
  main: ScenarioEvent;
  dependencies: (eventName: string) => ScenarioEvent[];
}): ScenarioEvent[] => {
  const { main, dependencies } = input;

  return [main, ...dependencies(main.name)];
};

export { makeDependency };
