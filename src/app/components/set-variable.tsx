import { getComponentName, setVariable } from "@/lib/variables";

type SetVariableProps = {
  name?: string | null;
  value?: string | null;
  isComponent?: boolean | string;
};

function isTrue(value: boolean | string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return value.toLowerCase() === "true";
}

/**
 * Asynchronously sets a variable value for MDX flows.
 */
export async function SetVariable({
  name = null,
  value = null,
  isComponent = false,
}: SetVariableProps) {
  if (!name) {
    return null;
  }

  const resolveFromComponentName = isTrue(isComponent);

  if (value === null && resolveFromComponentName === false) {
    return null;
  }

  try {
    let resolvedValue = value;

    if (resolveFromComponentName) {
      resolvedValue = await getComponentName(name);
    }

    await setVariable(name, resolvedValue ?? "");
  } catch {
    console.error("unable to set variable:", name);
    return null;
  }

  return null;
}
