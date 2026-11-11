import type {ReactNode} from 'react';

import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import StarButton from '@site/src/components/StarButton';

/** The `custom-star` navbar item: the star button in its small navbar form. */
function StarNavItem(): ReactNode {
  return <StarButton variant="nav" />;
}

export default {
  ...ComponentTypes,
  'custom-star': StarNavItem,
};
