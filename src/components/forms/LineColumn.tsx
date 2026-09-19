import React from "react";
import { Control, FieldValues, Path, useWatch } from "react-hook-form";

type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

export default function LineColumn<
  TValues extends FieldValues,
  TPath extends Path<TValues>,
>({
  index,
  control,
  name,
  children,
}: {
  index: number;
  control: Control<TValues>;
  name: TPath;
  children?: (value: ArrayElement<TValues[TPath]>) => React.ReactNode;
}) {
  const watch = useWatch({
    control,
    name: `${name}.${index}` as Path<TValues>,
  });

  return children ? children(watch as ArrayElement<TValues[TPath]>) : null;
}
