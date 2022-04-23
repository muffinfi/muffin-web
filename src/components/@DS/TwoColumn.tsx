import styled from 'styled-components/macro'

interface TwoColumnProps {
  rowGap?: string
  columnGap?: string
  labelMinWidth?: string
}

const TwoColumn = styled.table<TwoColumnProps>`
  --twoColumn-rowGap: ${({ rowGap }) => rowGap || '0.5em'};
  --twoColumn-columnGap: ${({ columnGap }) => columnGap || '1em'};
  --twoColumn-labelMinWidth: ${({ labelMinWidth }) => labelMinWidth || 'initial'};

  width: 100%;
  text-indent: 0;
  border-color: inherit;
  border-collapse: collapse;
  table-layout: auto;

  th {
    font-weight: inherit;
    white-space: nowrap;
  }

  th,
  td {
    padding: 0;
    padding-right: var(--twoColumn-columnGap);
    padding-bottom: var(--twoColumn-rowGap);
    width: auto;

    &:last-child:not(:first-child) {
      padding-right: 0;
      width: 100%;
    }

    &:first-child:not(:last-child) {
      min-width: var(--twoColumn-labelMinWidth);
    }
  }

  tr:last-child {
    & > td,
    & > th {
      padding-bottom: 0;
    }
  }
`

export default TwoColumn
