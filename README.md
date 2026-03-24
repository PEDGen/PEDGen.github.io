# Exercise Diagram Generator

Static web app to generate stacked diagrams for programming exercises, based on structured examples.

## Motivation

This tool was built to generate diagrams that replace natural language programming problem descriptions. Instead of asking students to "implement an algorithm that finds the max value in an array", you can show a diagram that receives an array with a few input/output examples and ask the student to:

1. analyze what is happening
2. create the code

This was motivated by GenAI's capacity to generate code from natural language descriptions. See the referenced paper for more information.

## Features (v002)

Supports creating diagrams for
  - array -> scalar
  - array -> array
  - scalar -> array
  - scalar -> scalar
  - array & scalar -> array

Also supports functions with multiple arguments (e.g. Argument 1 = array, Argument 2 = scalar).

## Run locally

Open `index.html` in your browser.

## Example data

- Function name: `f03`
- Additional notes: `Consider the examples array and respective output. What calculation could explain that transformation?`
- Argument count: `1`
- Argument 1 kind: `Array`
- Output kind: `Scalar`
- Example 1: `{1, 2, 3}` -> `3`
- Example 2: `{-1, -2, -3}` -> `-1`

Second example (2 arguments: array + scalar)
- Function name: `f04()`
- Additional notes: `Multiply each array element by the scalar argument.`
- Argument count: `2`
- Argument 1 kind: `Array`
- Argument 2 kind: `Scalar`
- Output kind: `Array`
- Example 1: `{1, 2, 3}`, `2` -> `{2, 4, 6}`
- Example 2: `{-1, 0, 4}`, `3` -> `{-3, 0, 12}`

## Reference

Cipriano, B. P., Alves, P., & Denny, P. (2024, September). A Picture is Worth a Thousand Words: Exploring Diagram and Video-Based OOP Exercises to Counter LLM Over-Reliance. In European Conference on Technology Enhanced Learning (pp. 75-89). Cham: Springer Nature Switzerland.
