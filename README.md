Glue - Scanner
==============

Scans objects sent to a Glue store and keeps track of their properties.

[![Build Status](https://travis-ci.org/ggioffreda/glued-scanner.svg?branch=master)](https://travis-ci.org/ggioffreda/glued-scanner)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Installation
------------

To run the service you can install with the `-g` flag and then run the
`glued-scanner` command:

    $ npm install -g glued-scanner
    $ glued-scanner

The scanner will try and connect to the AMQP message bus using the default
values, you can customise them by setting the *GLUED_AMQP* and 
*GLUED_MESSAGE_BUS* environment variables. You can find more information in the
[GluedJS - Common Utilities](https://github.com/ggioffreda/glued-common)
documentation.
