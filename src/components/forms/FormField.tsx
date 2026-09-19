import React from "react";
import {
  Controller,
  ControllerFieldState,
  ControllerRenderProps,
  UseFormReturn,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

export interface FormFieldRenderProps {
  field: ControllerRenderProps<any, string>;
  fieldState: ControllerFieldState;
}

interface Props {
  render?: (props: FormFieldRenderProps) => React.ReactElement;
  children?: React.ReactNode;
  name: string;
  label?: string;
  form: UseFormReturn<any>;
  placeholder?: string;
}

export default function FormField({ render, children, form, ...props }: Props) {
  return (
    <Controller
      control={form.control}
      name={props.name}
      render={({ field, fieldState }) => (
        <Field>
          {props.label && <FieldLabel>{props.label}</FieldLabel>}
          {render ? (
            render({ field, fieldState })
          ) : (
            <Input
              placeholder={props.placeholder}
              {...field}
              aria-invalid={fieldState.invalid}
              value={field.value ?? ""}
            />
          )}
          <FieldError>{fieldState.error?.message}</FieldError>
        </Field>
      )}
    />
  );
}
