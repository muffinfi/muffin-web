import styled from 'styled-components/macro'

export const Container = styled.div<{ maxWidth: string }>`
  max-width: ${({ maxWidth }) => maxWidth};
  width: 100%;
  margin: auto;
  margin-top: 1rem;
  /* margin-top: 72px; */
  /* margin-bottom: 72px; */
`

export const SectionCard = styled.div<{ greedyMargin?: boolean }>`
  border-radius: 16px;
  padding: 1.1rem;
  margin: ${({ greedyMargin }) => greedyMargin && '0 -1.1rem'};
  background-color: var(--layer1);
  /* border: 1px solid rgba(0, 0, 0, 0.06); */
  /* box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04); */
`
